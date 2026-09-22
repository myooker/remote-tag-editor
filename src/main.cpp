#include <iostream>
#include <string>
#include <filesystem>
#include <fstream>
#include <unordered_map>
#include <ctime>
#include <unordered_set>
#include <cctype>
#include <random>
#include <algorithm>

#include <nlohmann/json.hpp>
#include <crow.h>
#include <crow/compression.h>
#include <crow/middlewares/cors.h>
#include <CLI/CLI.hpp>

#include "../include/storage.h"
#include "../include/rte.h"
#include "../include/utils.h"
#include "format_handlers/factory.h"
#include "SQLiteCpp/SQLiteCpp.h"

using json = nlohmann::json;
using ordered_json = nlohmann::ordered_json;
namespace fs = std::filesystem;

static std::string fileExtensionToType(const std::string_view ext) {
    const std::string a { ext };
    const static std::unordered_map<std::string, std::string> s_extensionsMap {
        {".mp3",    "music"},      // done
        {".flac",   "music"},     // done
        {".m4a",    "music"},      // done
        {".ogg",    "music"},      // done
        {".opus",   "music"},
        {".aac",    "music"},      // not implemented
        {".wma",    "music"},      // not implemented
        {".wav",    "music"},      // not implemented
        {".aif",    "music"},      // not implemented
        {".aiff",   "music"},     // not implemented
        {".alac",   "music"},     // not implemented
        {".jpg",    "picture"},
        {".jpeg",   "picture"},
        {".png",    "picture"}
    };

    if (const auto it = s_extensionsMap.find(a); it != s_extensionsMap.end())
        return it->second;

    return "file";
}

static rte::EntityType fileExtensionToEntityType(const std::string_view ext) {
    using namespace rte;
    const std::string a { ext };
    const static std::unordered_map<std::string, EntityType> s_extensionMap {
        {".mp3",    EntityType::music},
        {".flac",   EntityType::music},
        {".m4a",    EntityType::music},
        {".ogg",    EntityType::music},
        {".opus",   EntityType::music},
        {".aac",    EntityType::music},
        {".wma",    EntityType::music},
        {".wav",    EntityType::music},
        {".aif",    EntityType::music},
        {".aiff",   EntityType::music},
        {".alac",   EntityType::music},
        {".jpg",    EntityType::picture},
        {".jpeg",   EntityType::picture},
        {".png",    EntityType::picture}
    };

    if (const auto it = s_extensionMap.find(a); it != s_extensionMap.end())
        return it->second;

    return EntityType::file;
}

static std::string getExtension(const std::string &path) {
    return fs::path{path}.extension().string();
}

static ordered_json buildDirectoryTree(const std::string &basePath, const int depth = rte::DIR_DEPTH::ARTIST, int depthCount = 0, bool contentOnly = false) {
    ordered_json rootTree = json::object();
    const fs::path root { basePath };
    rootTree["name"] = root.filename().lexically_normal().string();
    rootTree["type"] = "directory";
    rootTree["content"] = json::array();

    // This is a depth limiter
    // If a depthCount is equal to setuped depth, then it will return only name and type of directory.
    if (depthCount == depth && depthCount != -1)
        return rootTree;

    const auto fileNode = [](const std::string &path, const std::string &extension, const fs::path &relPath) {
        ordered_json jfile = json::object();
        jfile["name"] = relPath;
        jfile["type"] = fileExtensionToType(extension);
        jfile["extension"] = extension;
        return jfile;
    };

    for (const auto &entry : fs::directory_iterator(root)) {
        if (entry.is_symlink()) continue;
        if (entry.is_directory()) {
            const fs::path relPath = entry.path().lexically_relative(root);
            rootTree["content"].push_back(buildDirectoryTree(entry.path().string(), depth, depthCount + 1));
        } else {
            const fs::path relPath = entry.path().lexically_relative(root);
            const auto fileExtenstion = relPath.extension().string();
            rootTree["content"].push_back(fileNode(entry.path().string(), fileExtenstion, relPath));
        }
    }

    return rootTree;
}

static ordered_json buildDirectoryTree(const std::string &basePath, const rte::QueryList &query) {
    using namespace rte;

    std::vector<FileEntity> entities;
    const fs::path path { basePath };

    // Get size (number of entities) of inside a path and reserve it for vector
    {
        std::size_t count {};
        for (fs::directory_iterator it(path); it != fs::directory_iterator(); ++it)
            count++;
        entities.reserve(count);
        CROW_LOG_DEBUG << __PRETTY_FUNCTION__ << "Reserved: " << count;
    }

    for (const auto &e : fs::directory_iterator(path)) {
        if (e.is_symlink()) continue;
        std::string filename { e.path().filename() };
        std::string ext { e.path().extension() };
        EntityType type { fileExtensionToEntityType(ext) };
        if (e.is_directory()) {
            entities.push_back({
                .name = std::move(filename), .type = EntityType::directory
            });
            continue;
        }
        const uintmax_t size = e.file_size();
        entities.push_back({
            .name = std::move(filename), .ext = std::move(ext), .size = size, .type = type
        });
    }

    std::ranges::sort(entities, [&query](const auto &a, const auto &b) {
        return utils::entityLess(a, b, query);
    });

    ordered_json j = json::object();

    const std::size_t esize = entities.size();
    const std::size_t begin = std::min(query.offset, esize);
    const std::size_t end = begin + std::min(
        query.limit == 0 ? esize - begin : query.limit, esize - begin);

    j["path"] = basePath;
    j["total"] = esize;
    j["offset"] = begin;
    j["limit"] = query.limit;
    j["entities"] = json::array();

    for (std::size_t o = begin; o < end; o++) {
        ordered_json t = json::object();
        t["name"] = std::move(entities[o].name);
        t["type"] = entities[o].typeString();
        t["extension"] = std::move(entities[o].ext);
        t["size"] = entities[o].size;
        j["entities"].push_back(std::move(t));
    }

    return j;
}

static std::string generateId(const std::size_t t=16) {
    static constexpr std::string_view ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    static std::mt19937 rng(std::random_device{}());
    static std::uniform_int_distribution<std::size_t> distribution(0, ALPHABET.size() - 1);

    std::string id;
    id.reserve(t);

    for (std::size_t i = 0; i < t; i++) {
        id.push_back(ALPHABET[distribution(rng)]);
    }

    return id;
}

int main (int argc, char **argv) {
    using namespace rte::music;
    using namespace rte::music::handler;

    rte::Settings application {};
    int debugLevel {};
    auto logLevel { crow::LogLevel::Info };

    {
        CLI::App cli {
            "Backend API that edits music file tags (ID3/Vorbis) on request from a web‑based editor.",
            "app name"
        };

        cli.add_option("-m,--mount-point", application.mountpoint,
                "The directory of your music library")->required();
        cli.add_option("-p,--port", application.port,
            "The application's port to bind in. Default is 18080.")->default_val(18080);
        cli.add_option("-l,--log-level", debugLevel,
                "temp")->default_val(crow::LogLevel::WARNING);
        cli.add_option("--database-path", application.dbpath,
            "Database path location. Default is /")->default_val("data/database.db");
        cli.add_flag("--use-rteid", application.useRteid, "");
        CLI11_PARSE(cli, argc, argv);

        const auto rteid = std::getenv(rte::Environments::use_rteid.data());
        if (rteid) {
            if (strcasecmp(rteid, "true") == 0) application.useRteid = true;
            if (strcasecmp(rteid, "false") == 0) application.useRteid = false;
        }
    }

    switch (debugLevel) {
        case 0: logLevel = crow::LogLevel::DEBUG; break;
        case 1: logLevel = crow::LogLevel::INFO; break;
        case 2: logLevel = crow::LogLevel::WARNING; break;
        case 3: logLevel = crow::LogLevel::ERROR; break;
        case 4: logLevel = crow::LogLevel::CRITICAL; break;
        default: logLevel = crow::LogLevel::INFO; break;
    }

    CROW_LOG_DEBUG << "mountpoint: " << application.mountpoint << '\n';

#ifndef APP_TESTING
    if (application.isExist()) {
        CROW_LOG_CRITICAL << "Error: The specified mount point does not exist. Please verify the path and try again.";
        std::exit(-1);
    }
#endif

    std::unique_ptr<rte::storage::Database> db;
    try {
        db = std::make_unique<rte::storage::Database>(application.dbpath);
        tag::getTagMap(); // pointless call but it builds tag mapping table, could be changed overtime
    } catch (std::exception &e) {
        CROW_LOG_CRITICAL << e.what() << '\n';
        std::exit(1);
    }

    crow::App<crow::CORSHandler> app;
    CROW_LOG_INFO << rte::name << " ver " << rte::version << " is running now";

    CROW_ROUTE(app, "/api/events/delete").methods("POST"_method)
    ([&](const crow::request& req) {
        json j = json::parse(req.body);
        CROW_LOG_WARNING << "(api/events/delete) deletion";
        return db->deleteFile(j.value("path", "none"));
    });

    CROW_ROUTE(app, "/api/settings").methods("GET"_method)
    ([&]() {
        json j = {
            {"rteid", application.useRteid},
            {"mountpoint", application.mountpoint},
            {"version", rte::version },
        };
        crow::response response { j.dump() };
        response.set_header("Content-Type", "application/json");
        return response;
    });

    CROW_ROUTE(app, "/api/undo").methods("POST"_method)
    ([&](const crow::request& req) {
        using namespace TagLib;

        const std::string logPrefix { "(api/undo): " };
        json j = json::parse(req.body);

        crow::response response { 500 };

        // 1 - Parse information from request to query database
        // All we need to have is the following variables:
        const int id                { j.value("id", -1) }; // add enum NOT_FOUND instead of -1
        const std::string rteid     { j.value("rteid", rte::jsonMissingValue) };
        const std::string path      { j.value("path", rte::jsonMissingValue) };
        std::string tag             { j.value("tag", rte::jsonMissingValue) };

        CROW_LOG_WARNING << logPrefix << "id: " << id;
        CROW_LOG_WARNING << logPrefix << "rteid: " << rteid;
        CROW_LOG_WARNING << logPrefix << "path: " << path;
        CROW_LOG_WARNING << logPrefix << "tag: " << tag;

        auto handler = Factory::create(getExtension(path));
        auto rtag = handler->resolveTag(tag);
        if (!rtag.has_value()) {
            CROW_LOG_WARNING << logPrefix << rtag.error();
            response.body = rtag.error();
            return response;
        }
        tag = rtag.value();
        CROW_LOG_WARNING << logPrefix << "resolved tag: " << tag;

        // 2 - Get information from query
        SQLite::Statement q { db->getDatabase(),
            "SELECT action, old_value, new_value FROM tag_history "
            "WHERE id >= ? AND (rteid = ? OR path = ?) AND tag = ? "
            "ORDER BY id DESC;"
        };
        q.bind(1, id);
        q.bind(2, rteid);
        q.bind(3, path);
        q.bind(4, tag);

        bool isGood { true };
        while (isGood && q.executeStep()) {
            String action     { q.getColumn(0).getString(), String::UTF8 };
            String oldValue   { q.getColumn(1).getString(), String::UTF8 };
            String newValue   { q.getColumn(2).getString(), String::UTF8 };

            if (action == "add") {
                isGood = handler->removeMusicTag
                    ({.filePath = path, .fieldType = tag, .value = newValue}).code == 200;
            } else if (action == "change") {
                isGood = handler->editMusicTags
                    ({.filePath = path, .fieldType = tag, .replaceWhat = newValue, .replaceWith = oldValue}).code == 200;
            } else if (action == "remove") {
                isGood = handler->addMusicTag
                    ({.filePath = path, .fieldType = tag, .value = oldValue}).code == 200;
            }
        }

        if (isGood) {
            SQLite::Statement d { db->getDatabase(),
                "DELETE FROM tag_history "
                "WHERE id >= ? AND (rteid = ? OR path = ?) AND tag = ?;"
            };
            d.bind(1, id);
            d.bind(2, rteid);
            d.bind(3, path);
            d.bind(4, tag);
            d.exec();

            response.code = 200;
        }

        return response;
    });

    CROW_ROUTE(app, "/api/getalbumcover").methods("GET"_method)
    ([&](const crow::request& req) {
        crow::response response{500};
        const std::string filePath = req.url_params.get("path");
        if (!application.isMountPoint(filePath)) {
            return crow::response { 500, "LOL NO" };
        }
        auto handler = Factory::create(getExtension(filePath));
        auto picture = handler->getAlbumCover(filePath);

        response.body.assign(picture.data.data(), picture.data.size());
        response.set_header("Content-Type", picture.mimeType);
        response.code = 200;

        return response;
    });

    CROW_ROUTE(app, "/api/gethistory").methods("GET"_method)
    ([&](const crow::request &req) {
        std::string fileIdentifier = req.url_params.get("identifier");
        std::string clause { "path = ?" }; // By default, it searches by path

        if (application.useRteid) // If a user don't mind to use RTEID
            clause = "rteid = ?";

        SQLite::Statement query(db->getDatabase(), "SELECT * FROM tag_history WHERE "
            +clause +" ORDER BY changed_at DESC");
        query.bind(1, fileIdentifier.c_str());
        json result = json::array();

        while (query.executeStep()) {
            int i { -1 };
            result.push_back({
                {"id",              query.getColumn(++i).getInt()},
                {"path",            query.getColumn(++i).getString()},
                {"rteid",           query.getColumn(++i).getString()},
                {"action",          query.getColumn(++i).getString()},
                {"tag",             query.getColumn(++i).getString()},
                {"old_value",       query.getColumn(++i).getString()},
                {"new_value",       query.getColumn(++i).getString()},
                {"changed_at",      query.getColumn(++i).getString()},
            });
        }

        crow::response response { result.dump() };
        response.set_header("Content-Type", "application/json");

        return response;
    });

    CROW_ROUTE(app, "/api/getmntpoint").methods("GET"_method)
    ([&]() {
        json mountpoint;
        mountpoint["path"] = application.mountpoint;
        crow::response response{ 200, mountpoint.dump() };
        response.set_header("Content-Type", "application/json");

        return response;
    });

    CROW_ROUTE(app, "/api/edittag").methods("POST"_method)
    ([&](const crow::request &req) {
        using namespace TagLib;

        const std::string logPrefix { "(api/edittag): " };
        const ordered_json body = json::parse(req.body);

        rte::TagModification tagStruct {
            .filePath = body.value("path", rte::jsonMissingValue),
            .fieldType = body.value("tagType", rte::jsonMissingValue),
            .replaceWhat = { body.value("replaceWhat", rte::jsonMissingValue), String::UTF8 },
            .replaceWith = { body.value("replaceWith", rte::jsonMissingValue), String::UTF8 },
        };
        if (!tagStruct.isValid()) {
            CROW_LOG_ERROR << logPrefix << "tagStruct is invalid. Please check sending requests.";
            return crow::response { 400, "Request is not valid. Please check sending request" };
        }
        rte::storage::id id {};
        const std::string fileExtension { getExtension(tagStruct.filePath) };

        CROW_LOG_WARNING << "(api/edittag) requested path: " << tagStruct.filePath;

        const auto handler = Factory::create(fileExtension);
        const auto rtag = handler->resolveTag(tagStruct.fieldType);
        if (!rtag.has_value()) {
            CROW_LOG_ERROR << rtag.error();
            return crow::response { 500, rtag.error() };
        }
        tagStruct.fieldType = rtag.value();
        CROW_LOG_WARNING << logPrefix << "resolved tag: " << tagStruct.fieldType;

        if (application.useRteid) id.rte = generateId();
        crow::response response(handler->editMusicTags(tagStruct, application.useRteid ? &id.rte : nullptr));

        if (response.code == 200) {
            return db->insertEdit(tagStruct, id);
        }

        return response;
    });

    CROW_ROUTE(app, "/api/addfieldtag").methods("POST"_method)
    ([&](const crow::request &req) {
        using namespace TagLib;

        const std::string logPrefix { "(api/addfieldtag): " };
        const ordered_json body = json::parse(req.body);

        rte::TagModification tagStruct {
            .filePath = body.value("path", rte::jsonMissingValue),
            .fieldType = body.value("fieldType", rte::jsonMissingValue),
            .value = { body.value("value", rte::jsonMissingValue), String::UTF8 }
        };
        if (!tagStruct.isValid()) {
            CROW_LOG_ERROR << logPrefix << "tagStruct is invalid. Please check sending requests.";
            return crow::response { 400, "Request is not valid. Please check sending request" };
        }
        rte::storage::id id {};
        const std::string fileExtension { getExtension(tagStruct.filePath) };

        CROW_LOG_WARNING << logPrefix << "requested path: " << tagStruct.filePath;

        const auto handler = Factory::create(fileExtension);
        const auto rtag = handler->resolveTag(tagStruct.fieldType);
        if (!rtag.has_value()) {
            CROW_LOG_ERROR << rtag.error();
            return crow::response { 500, rtag.error() };
        }
        tagStruct.fieldType = rtag.value();
        CROW_LOG_WARNING << logPrefix << "resolved tag: " << tagStruct.fieldType;

        if (application.useRteid) id.rte = generateId();
        crow::response response(handler->addMusicTag(tagStruct, application.useRteid ? &id.rte : nullptr));

        if (response.code == 200) {
            return db->insertAdd(tagStruct, id);
        }
        return response;
    });

    CROW_ROUTE(app, "/api/removefieldtag").methods("POST"_method)
    ([&](const crow::request &req) {
        using namespace TagLib;

        const std::string logPrefix { "(api/removefieldtag): " };
        const ordered_json body = json::parse(req.body);

        rte::TagModification tagStruct {
            .filePath = body.value("path", "none"),
            .fieldType = body.value("fieldType", "none"),
            .value = { body.value("value", "none"), String::UTF8 }
        };
        rte::storage::id id {};
        const std::string fileExtension { getExtension(tagStruct.filePath) };

        CROW_LOG_WARNING << "(api/removefieldtag) requested path: " << tagStruct.filePath;

        if (tagStruct.fieldType == "RTEID" && application.useRteid)
            return crow::response { 400, "You cannot modify RTEID" };

        const auto handler = Factory::create(fileExtension);
        const auto rtag = handler->resolveTag(tagStruct.fieldType);
        if (!rtag.has_value()) {
            CROW_LOG_ERROR << rtag.error();
            return crow::response { 500, rtag.error() };
        }
        tagStruct.fieldType = rtag.value();
        CROW_LOG_WARNING << logPrefix << "resolved tag: " << tagStruct.fieldType;

        if (application.useRteid) id.rte = generateId();
        crow::response response(handler->removeMusicTag(tagStruct, application.useRteid ? &id.rte : nullptr));

        if (response.code == 200) {
            return db->insertRemove(tagStruct, id);
        }

        return response;
    });

    CROW_ROUTE(app, "/api/store").methods("POST"_method)
    ([&](const crow::request &req) {
        const std::string logPrefix { "(api/store): " };
        crow::multipart::message_view msg (req);
        const std::string_view *filepart { nullptr }; // Store binary data of a file
        std::string_view filepath {};
        std::string_view filename {};

        // Parse multipart map
        for (const auto &entry : msg.part_map) {
            // Find "path" in part map, assign file's path to filepath and log it
            if (entry.first == "path") {
                filepath = entry.second.body;
                CROW_LOG_INFO << "(api/store) path = " << filepath;

                if (!application.isMountPoint(std::string(filepath))) {
                    CROW_LOG_ERROR << logPrefix << "requested filepath is not a mount-point";
                    return crow::response{ 500, "The requested path is not a mount-point" };
                }
            }
            // Find "file" in part map, assign binary data to filepart variable
            // Search for "Content-Disposition" header, search "filename" in it
            // Assign it to filename variable and log it
            if (entry.first == "file") {
                filepart = &entry.second.body; // Binary data
                auto header_it = entry.second.headers.find("Content-Disposition");
                if (header_it == entry.second.headers.end()) {
                    CROW_LOG_ERROR << "(api/store) No Content-Disposition found";
                    return crow::response(400, "Content-Disposition Not Found");
                }
                for (const auto &[key, value] : header_it->second.params) {
                    CROW_LOG_DEBUG << "(api/store)" << key << " = " << value;
                    if (key == "filename") {
                        filename = value;
                    }
                }
                CROW_LOG_INFO << "(api/store) filename = " << filename;
            }

            // Now we need to store files on a drive
            fs::path destinationPath = fs::path(filepath) / fs::path(filename).filename();
            CROW_LOG_DEBUG << "(api/store) destinationPath.string(): " << destinationPath.string();
            CROW_LOG_DEBUG << "(api/store) destinationPath.filename(): " << destinationPath.filename();
            std::ofstream outfile { destinationPath, std::ios::binary };
            if (filepart) {
                CROW_LOG_DEBUG << "(api/store) outFile.write() starts";
                outfile.write(filepart->data(), filepart->size());
                CROW_LOG_DEBUG << "(api/store) outFile.write() ends";
                outfile.close();
                CROW_LOG_DEBUG << "(api/store) outFile.close()";
            } else {
                CROW_LOG_CRITICAL << "(api/store) std::string_view *filepart is nullptr";
                return crow::response { 500, "nullptr" };
            }
        }
        return crow::response{ 200, "OK"};
    });

    CROW_ROUTE(app, "/api/rename").methods("POST"_method)
    ([&](const crow::request &req) {
        const std::string logPrefix { "(api/rename): " };

        const ordered_json root = json::parse(req.body);
        const std::string newdirname { "/" + root["newName"].get<std::string>() };
        const fs::path oldpath { root["path"] };
        fs::rename(oldpath, oldpath.parent_path().string() + newdirname);
        return crow::response{ 200, "OK"};
    });

    CROW_ROUTE(app, "/api/mkdir").methods("POST"_method)
    ([&](const crow::request &req) {
        const std::string logPrefix {"(api/mkdir): "};

        const ordered_json body = json::parse(req.body);
        const std::string dir { body["path"].get<std::string>() + "/" + body["name"].get<std::string>() }; //ugly as fuck
        if (fs::exists(dir)) {
            CROW_LOG_ERROR << logPrefix << "the specified directory already exists";
            return crow::response { 500, "Error: The specified directory already exist" };
        }
        fs::create_directory(dir);
        return crow::response{ 200 };
    });

    CROW_ROUTE(app, "/api/tag").methods("GET"_method)
    ([&](const crow::request &req) {
        const std::string logPrefix { "(api/tag): " };

        const std::string filePath = req.url_params.get("path");
        const std::string fileExtension = fs::path(filePath).extension().string();
        CROW_LOG_WARNING << logPrefix << "requested file: " << filePath;

        const auto handler = Factory::create(fileExtension);
        const auto result = handler->listMusicTags(filePath);

        if (!result.has_value()) {
            CROW_LOG_ERROR << logPrefix << "error occurred: " << result.error();
            crow::response res(500, result.error());
            return res;
        }

        crow::response res(result.value().dump());
        res.set_header("Content-Type", "application/json");
        return res;
    });

    CROW_ROUTE(app, "/api/tag-registry")
    ([]() {
        using namespace rte::music::tag;
        const auto map = getTagMap();
        if (!map)
            return crow::response { 400 };

        crow::response res { map->aliases().dump() };
        res.set_header("Content-Type", "application/json");
        return res;
    });

    CROW_ROUTE(app, "/api/heartbeat")
    ([]() {
        return crow::response{ 200, "OK"};
    });

    CROW_ROUTE(app, "/api/list").methods("GET"_method)
    ([&] (const crow::request &req){
        const std::string logPrefix { "(api/list): "};
        std::string requestedPath = req.url_params.get("path");

        // Remove trailing slash for buildMainDirectoryTree
        while (requestedPath.size() > 1 && requestedPath.ends_with('/'))
            requestedPath.pop_back();

        if (fs::path filePath{ requestedPath }; application.isMountPoint(filePath)) {
            if (fs::is_regular_file(filePath))
                filePath = filePath.parent_path();

            CROW_LOG_WARNING << logPrefix << "building tree for: " << filePath;
            auto directoryTree = buildDirectoryTree(filePath, rte::DIR_DEPTH::ARTIST);
            directoryTree["path"] = filePath.generic_string();
            crow::response res(directoryTree.dump());
            res.set_header("Content-Type", "application/json");

            return res;
        }

        CROW_LOG_ERROR << logPrefix << "requested filepath is not a mount-point";
        return crow::response{ 500, "The requested path is not a mount-point" };
    });

    CROW_ROUTE(app, "/api/list-v2").methods("GET"_method)
    ([&] (const crow::request &req){
        using namespace rte;
        using SortType = QueryList::SortType;

        constexpr std::string_view logPrefix { "(api/list-v2): "};
        try {
            const char *path = req.url_params.get("path");
            const char *limit = req.url_params.get("limit");
            const char *offset = req.url_params.get("offset");
            const char *sort = req.url_params.get("sort");
            const char *asc = req.url_params.get("asc");

            if (!limit) limit = "0";
            if (!offset) offset = "0";

            auto sortType { SortType::name };
            if (sort) {
                const auto p = utils::parseSortType(sort);
                if (!p) return crow::response { 400, "Unknown sort column" };
                sortType = *p;
            }

            bool ascending { true };
            if (asc) {
                const auto p = utils::parseBool(asc);
                if (!p) return crow::response { 400, "asc is not a Boolean" };
                ascending = *p;
            }

            if (path) {
                if (!application.isMountPoint(path)) {
                    CROW_LOG_ERROR << logPrefix << "requested filepath is not a mount-point";
                    return crow::response { 403, "The requested path is not a mount-point" };
                }
                fs::path fpath;
                {
                    std::string spath = path;
                    while (spath.ends_with('/'))
                        spath.pop_back();
                    fpath = std::move(spath);
                }
                if (fs::is_regular_file(fpath))
                    fpath = fpath.parent_path();
                const QueryList q {
                    .offset = static_cast<std::size_t>(std::max(0, std::stoi(offset))),
                    .limit = static_cast<std::size_t>(std::max(0, std::stoi(limit))),
                    .ascending = ascending,
                    .sort = sortType
                };
                crow::response res { buildDirectoryTree(fpath.string(), q).dump() };
                res.set_header("Content-Type", "application/json");

                return res;
            }
            if (!path) {
                CROW_LOG_ERROR << logPrefix << "path is missing";
                return crow::response { 400, "path is missing" };
            }
            return crow::response { 500 };
        } catch (std::invalid_argument&) {
            CROW_LOG_ERROR << logPrefix << "limit or offset is not a number";
            return crow::response { 400, "limit or offset is not a number" };
        } catch (std::out_of_range&) {
            CROW_LOG_ERROR << logPrefix << "limit or offset is out of range";
            return crow::response { 400, "limit or offset is out of range" };
        } catch (std::exception &e) {
            CROW_LOG_ERROR << logPrefix << e.what();
            return crow::response { 500, "Something went wrong. Check logs." };
        }

    });

    app.loglevel(logLevel);
    app.use_compression(crow::compression::GZIP);
    app.port(application.port).multithreaded().run();

    return 0;
}