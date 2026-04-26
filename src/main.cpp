#include <iostream>
#include <string>
#include <filesystem>
#include <fstream>
#include <unordered_map>
#include <ctime>
#include <unordered_set>
#include <cctype>
#include <random>

#include <nlohmann/json.hpp>
#include <crow.h>
#include <crow/middlewares/cors.h>
#include <CLI/CLI.hpp>

#include "../include/program.h"
#include "../include/musicTagHandlerFactory.h"
#include "tests/tests.h"
#include "SQLiteCpp/SQLiteCpp.h"

//#define APP_TESTING

#define ACTION_ADD "add"
#define ACTION_REMOVE "remove"
#define ACTION_CHANGE "change"

using json = nlohmann::json;
using ordered_json = nlohmann::ordered_json;

namespace fs = std::filesystem;

std::string fileExtensionToType(const std::string &ext) {
    const static std::unordered_map<std::string, std::string> s_extensionsMap {
        {".mp3", "music"},      // done
        {".flac", "music"},     // done
        {".m4a", "music"},      // done
        {".ogg", "music"},      // done
        {".opus", "music"},
        {".aac", "music"},      // not implemented
        {".wma", "music"},      // not implemented
        {".wav", "music"},      // not implemented
        {".aif", "music"},      // not implemented
        {".aiff", "music"},     // not implemented
        {".alac", "music"},     // not implemented
        {".jpg", "picture"},
        {".jpeg", "picture"},
        {".png", "picture"}
    };

    if (const auto it = s_extensionsMap.find(ext); it != s_extensionsMap.end()) {
        return it->second;
    } else {
        return "file";
    }
}

std::string getExtension(const std::string &path) {
    CROW_LOG_DEBUG << "(" << __func__ << ") " << path;
    return fs::path{path}.extension().string();
}

ordered_json buildDirectoryTree(const std::string &basePath, const int depth = program::DIR_DEPTH::ARTIST, int depthCount = 0, bool contentOnly = false) {
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

std::string generateId() {
    static constexpr std::string_view ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    constexpr std::size_t t = 16;

    std::mt19937 rng(std::random_device{}());
    std::uniform_int_distribution<std::size_t> distribution(0, ALPHABET.size() - 1);

    std::string id;
    id.reserve(t);

    for (std::size_t i = 0; i < t; i++) {
        id.push_back(ALPHABET[distribution(rng)]);
    }

    return id;
}

int main (int argc, char **argv) {
    program::Settings application {};
    int debugLevel {};
    auto logLevel { crow::LogLevel::Info };
    CLI::App cli {"Backend API that edits music file tags (ID3/Vorbis) on request from a web‑based editor.", "app name"};

#ifndef APP_TESTING
    cli.add_option("-m,--mount-point", application.mountpoint,
            "The directory of your music library")->required();
#endif

#ifdef APP_DEBUG
    cli.add_flag("--no-crow", application.disableCrowServer,
        "Disables Crow server.");
    cli.add_option("--test-file", application.testFile,
            "Path to the test directory");
    cli.add_option("--test-directory", application.testDirectory);
#endif

    cli.add_option("-p,--port", application.port,
        "The application's port to bind in. Default is 18080.")->default_val(18080);
    cli.add_option("-l,--log-level", debugLevel,
            "temp")->default_val(crow::LogLevel::INFO);
    cli.add_option("--database-path", application.dbpath,
        "Database path location. Default is /")->default_val("database.db");

    CLI11_PARSE(cli, argc, argv);

    switch (debugLevel) {
        case 0: logLevel = crow::LogLevel::DEBUG; break;
        case 1: logLevel = crow::LogLevel::INFO; break;
        case 2: logLevel = crow::LogLevel::WARNING; break;
        case 3: logLevel = crow::LogLevel::ERROR; break;
        case 4: logLevel = crow::LogLevel::CRITICAL; break;
        default: logLevel = crow::LogLevel::INFO; break;
    }

    CROW_LOG_DEBUG << "debugFile: " << application.testFile << '\n';
    CROW_LOG_DEBUG << "mountpoint: " << application.mountpoint << '\n';

#ifndef APP_TESTING
    if (application.isExist()) {
        CROW_LOG_CRITICAL << "Error: The specified mount point does not exist. Please verify the path and try again.";
        std::exit(-1);
    }
#endif

    SQLite::Database db (application.dbpath, SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE);
    std::cout << "Opening database " << db.getFilename().c_str() << '\n';
    db.exec(R"(
        CREATE TABLE IF NOT EXISTS tag_history (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            path         TEXT    NOT NULL,
            shortid      TEXT    NOT NULL,
            action       TEXT    NOT NULL,
            tag          TEXT    NOT NULL,
            old_value    TEXT,
            new_value    TEXT,
            changed_at   TEXT NOT NULL DEFAULT (datetime('now'))
        )
    )");

    if (!application.disableCrowServer) {
        crow::App<crow::CORSHandler> app;
        CROW_LOG_INFO << program::name << " ver " << program::version << " is running now";

        CROW_ROUTE(app, "/api/gethistory").methods("GET"_method)
        ([&](const crow::request &req) {
            std::string filePath = req.url_params.get("path");
            SQLite::Statement query(db, "SELECT * FROM tag_history WHERE shortid = ? ORDER BY changed_at DESC");
            query.bind(1, filePath.c_str());
            json result = json::array();

            while (query.executeStep()) {
                result.push_back({
                    {"id", query.getColumn(0).getInt()},
                    {"path", query.getColumn(1).getString()},
                    {"shortid", query.getColumn(2).getString()},
                    {"action", query.getColumn(3).getString()},
                    {"tag", query.getColumn(4).getString()},
                    {"old_value", query.getColumn(5).getString()},
                    {"new_value", query.getColumn(6).getString()},
                    {"changed_at", query.getColumn(7).getString()},
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
            CROW_LOG_INFO << "mountpoint: " << mountpoint;
            crow::response response{ 200, mountpoint.dump() };
            response.set_header("Content-Type", "application/json");

            return response;
        });

        CROW_ROUTE(app, "/api/edittag").methods("POST"_method)
        ([&](const crow::request &req) {
            const ordered_json body = json::parse(req.body);

            program::TagModification tagStruct {
                body.value("path", "none"),
                body.value("tagType", "none"),
                body.value("replaceWhat", "none"),
                body.value("replaceWith", "none"),
                ""
            };

            const std::string fileExtension { getExtension(tagStruct.filePath) };

            CROW_LOG_INFO << "(api/edittag) requested path: " << tagStruct.filePath;
            CROW_LOG_DEBUG << "(api/edittag) requested file extension: " << fileExtension;
            CROW_LOG_DEBUG << "(api/edittag) requested field: " << tagStruct.fieldType;
            CROW_LOG_DEBUG << "(api/edittag) requested replaceWhat: " << tagStruct.replaceWhat;
            CROW_LOG_DEBUG << "(api/edittag) requested replaceWith: " << tagStruct.replaceWith;

            const auto handler = musicTagHandlerFactory::createHandler(fileExtension);

            crow::response response(handler->editMusicTags(tagStruct));
            if (response.code == 200) {
                std::string sid { generateId() };
                const auto RTEID = handler->hasRTEID(tagStruct.filePath);
                if (RTEID) {
                    sid = RTEID.value();
                } else {
                    handler->addMusicTag(program::getRTEIDStruct(tagStruct.filePath, sid));
                }
                program::database::insertEdit(db, tagStruct, sid);

            }
            return response;
        });

        CROW_ROUTE(app, "/api/addfieldtag").methods("POST"_method)
        ([&](const crow::request &req) {
            const ordered_json body = json::parse(req.body);

            program::TagModification tagStruct {
                body.value("path", "none"),
                body.value("fieldType", "none"),
                "",
                "",
                body.value("value", "none")
            };

            const std::string fileExtension { getExtension(tagStruct.filePath) };

            CROW_LOG_INFO << "(api/addfieldtag) requested path: " << tagStruct.filePath;
            CROW_LOG_DEBUG << "(api/addfieldtag) requested file extension: " << fileExtension;
            CROW_LOG_DEBUG << "(api/addfieldtag) requested field: " << tagStruct.fieldType;
            CROW_LOG_DEBUG << "(api/addfieldtag) requested value: " << tagStruct.value;

            const auto handler = musicTagHandlerFactory::createHandler(fileExtension);

            crow::response response(handler->addMusicTag(tagStruct));
            if (response.code == 200) {
                std::string sid { generateId() };
                const auto RTEID = handler->hasRTEID(tagStruct.filePath);
                if (RTEID) {
                    sid = RTEID.value();
                } else {
                    handler->addMusicTag(program::getRTEIDStruct(tagStruct.filePath, sid));
                }
                program::database::insertAdd(db, tagStruct, sid);
                return response;
            }
            return response;
        });

        CROW_ROUTE(app, "/api/removefieldtag").methods("POST"_method)
        ([&](const crow::request &req) {
            const ordered_json body = json::parse(req.body);

            program::TagModification tagStruct {
                body.value("path", "none"),
                body.value("fieldType", "none"),
                "",
                "",
                body.value("value", "none")
            };

            const std::string fileExtension { getExtension(tagStruct.filePath) };

            CROW_LOG_INFO << "(api/removefieldtag) requested path: " << tagStruct.filePath;
            CROW_LOG_DEBUG << "(api/removefieldtag) requested file extension: " << fileExtension;
            CROW_LOG_DEBUG << "(api/removefieldtag) requested field: " << tagStruct.fieldType;
            CROW_LOG_DEBUG << "(api/removefieldtag) requested value: " << tagStruct.value;

            const auto handler = musicTagHandlerFactory::createHandler(fileExtension);

            crow::response response (handler->removeMusicTag(tagStruct));
            if (response.code == 200) {
                std::string sid { generateId() };
                const auto RTEID = handler->hasRTEID(tagStruct.filePath);
                if (RTEID) {
                    sid = RTEID.value();
                } else {
                    handler->addMusicTag(program::getRTEIDStruct(tagStruct.filePath, sid));
                }
                program::database::insertRemove(db, tagStruct, sid);
                return response;
            }
            return response;
        });

        CROW_ROUTE(app, "/api/store").methods("POST"_method)
        ([&](const crow::request &req) {
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
                        CROW_LOG_WARNING << "(api/store) requested filepath is not a mount-point";
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
            const ordered_json root = json::parse(req.body);
            const std::string newdirname { "/" + root["newName"].get<std::string>() };
            const fs::path oldpath { root["path"] };
            fs::rename(oldpath, oldpath.parent_path().string() + newdirname);
            return crow::response{ 200, "OK"};
        });

        CROW_ROUTE(app, "/api/mkdir").methods("POST"_method)
        ([&](const crow::request &req) {
            const ordered_json body = json::parse(req.body);
            const std::string dir { body["path"].get<std::string>() + "/" + body["name"].get<std::string>() }; //ugly as fuck
            if (fs::exists(dir)) {
                std::cerr << "Error: The specified directory already exist\n";
                return crow::response { 500, "Error: The specified directory already exist" };
            }
            fs::create_directory(dir);
            return crow::response{ 200 };
        });

        CROW_ROUTE(app, "/api/tag").methods("GET"_method)
        ([&](const crow::request &req) {
            const std::string filePath = req.url_params.get("path");
            const std::string fileExtension = fs::path(filePath).extension().string();
            CROW_LOG_INFO << "(api/tag) requested filepath: " << filePath;
            CROW_LOG_DEBUG << "(api/tag) requested file extension: " << fileExtension;

            const auto handler = musicTagHandlerFactory::createHandler(fileExtension);
            const auto result = handler->listMusicTags(filePath);

            if (!result.has_value()) {
                CROW_LOG_ERROR << "(api/tag) error occurred: " << result.error();
                crow::response errorResponse(500, result.error());
                CROW_LOG_ERROR << "(api/tag) returning status: " << errorResponse.code;
                return errorResponse;
            } else {
                crow::response response(result.value().dump());
                response.set_header("Content-Type", "application/json");
                return response;
            }
        });

        CROW_ROUTE(app, "/api/tag-registry")
        ([]() {
            using namespace program::music::tag;
            crow::response response (getJsonTagRegistry().dump());
            response.set_header("Content-Type", "application/json");

            return response;
        });

        CROW_ROUTE(app, "/api/heartbeat")
        ([]() {
            return crow::response{ 200, "OK"};
        });

        CROW_ROUTE(app, "/api/list").methods("GET"_method)
        ([&] (const crow::request &req){
            std::string filePath = req.url_params.get("path");

            if (application.isMountPoint(filePath)) {
                // Remove trailing slash for buildMainDirectoryTree
                if (filePath.ends_with('/')) {
                    filePath.pop_back();
                }

                CROW_LOG_INFO << "(api/list) building tree for: " << filePath;
                const auto directoryTree = buildDirectoryTree(filePath, program::DIR_DEPTH::ARTIST);
                crow::response response(directoryTree.dump());
                response.set_header("Content-Type", "application/json");

                return response;
            } else {
                CROW_LOG_WARNING << "(api/tag) requested filepath is not a mount-point";
                return crow::response{ 500, "The requested path is not a mount-point" };
            }
        });

        app.loglevel(logLevel);
        app.port(application.port).multithreaded().run();
    }

    return 0;
}