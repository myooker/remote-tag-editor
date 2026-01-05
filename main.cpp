#include <iostream>
#include <string>
#include <filesystem>
#include <fstream>
#include <unordered_map>
#include <ctime>
#include <unordered_set>

#include <nlohmann/json.hpp>
#include <crow.h>
#include <crow/middlewares/cors.h>

#include "FLAC/flac.h"
#include "MPEG/mpeg.h"

using json = nlohmann::json;
using ordered_json = nlohmann::ordered_json;

namespace fs = std::filesystem;

enum DIR_DEPTH {
    ARTIST = 1,
    ARTIST_AND_ALBUMS = 2,
    ALL = 100,
};

namespace program {
    constexpr std::string_view version { "Alpha 1.0.0" };
    constexpr std::string_view name { "web-tag-editor" };
    struct settings {
        std::string mountpoint { "/home/myooker/music2" };
        std::string testFlacFile { "/home/myooker/music2/01 Shadow Wizard Money Gang, Cynthoni - Psychic Unhealing.flac" };
        std::string testMp3File { "/home/myooker/music2/A.L.I.S.O.N - Seagulls.mp3"};
        [[nodiscard]] bool isExist() const {
            const fs::path p { mountpoint };
            return !fs::exists(p);
        }
    };
}

std::string fileExtensionToType(const std::string &ext) {
    const std::unordered_map<std::string, std::string> extensionsMap {
        {".mp3", "music"},
        {".flac", "music"},
        {".m4a", "music"},
        {".ogg", "music"},
        {".jpg", "picture"},
        {".jpeg", "picture"},
        {".png", "picture"}
    };

    if (const auto it = extensionsMap.find(ext); it != extensionsMap.end()) {
        return it->second;
    } else {
        return "file";
    }
}

int typeOrder(const std::string &type) {
    const std::unordered_map<std::string, int> map {
        {"directory", 0},
        {"music", 1},
        {"picture", 2},
        {"file", 3},
    };
    if (const auto it = map.find(type); it != map.end()) {
        return it->second;
    } else {
        return 4;
    }
}

json listTags(const std::string &path) {
    const std::function flac { &FLAC::listMusicTags };
    const std::function mpeg { &MPEG::listMusicTags };

    const std::filesystem::path tempPath(path);
    const auto ext = tempPath.extension().string();

    CROW_LOG_DEBUG << "( " << __func__ << " )" << " File Extension: " << ext;

    if (ext == ".mp3") {
        return mpeg(path);
    } else if (ext == ".flac") {
        return flac(path);
    }

    json j;
    j["path"] = path;
    j["error"] = "unsupported file type";
    return j;
}

ordered_json buildMainDirectoryTree(const std::string &basePath, const int depth = DIR_DEPTH::ARTIST, int depthCount = 0, bool contentOnly = false) {
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
            rootTree["content"].push_back(buildMainDirectoryTree(entry.path().string(), depth, depthCount + 1));
        } else {
            const fs::path relPath = entry.path().lexically_relative(root);
            const auto fileExtenstion = relPath.extension().string();
            rootTree["content"].push_back(fileNode(entry.path().string(), fileExtenstion, relPath));
        }
    }

    // This sorting mechanism sorts by character only! Resulting behavior that is not expected.
    // For example:
    // 1. Deja Vu.flac
    // 10. Resentment.flac
    // 11. Encore For The Fans.flac
    // ...
    // But should be the following:
    // 1. Deja Vu.flac
    // 2. Get Me Bodied.flac
    // 3. Suga Mama.flac
    // ...
    // TODO:
    // Rewrite this sorting mechanism to sort it not only by character, but by numbers as well.
    std::sort(rootTree["content"].begin(), rootTree["content"].end(), [](const ordered_json &a, const ordered_json &b) {
        return typeOrder(a["type"]) < typeOrder(b["type"]) ||
                typeOrder(a["type"]) == typeOrder(b["type"]) &&
                a["name"] < b["name"];
    });
    return rootTree;
}

int main (int argc, char **argv) {
    program::settings application {};

    if (application.isExist()) {
        CROW_LOG_CRITICAL << "Error: The specified mount point does not exist. Please verify the path and try again.";
        std::exit(-1);
    }
    
    crow::App<crow::CORSHandler> app;
    auto &cors = app.get_middleware<crow::CORSHandler>();
    CROW_LOG_INFO << program::name << " ver " << program::version << " is running now";

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
        const fs::path fspath { body["path"] };
        const std::string fileExtension { fspath.extension() };

        if (fileExtension == ".mp3") {
            CROW_LOG_ERROR << fileExtension << " is not supported";
            return crow::response { 500, "Not supported" };
        }

        if (const auto it = body.find("replaceWhat"); it != body.end()) {
            return FLAC::editMusicTags(body["path"], body["tagType"], body["replaceWhat"], body["replaceWith"]);
        } else {
            return FLAC::editMusicTags(body["path"], body["tagType"], body["replaceWith"]);
        }
    });

    CROW_ROUTE(app, "/api/addfieldtag").methods("POST"_method)
    ([&](const crow::request &req) {
        const ordered_json body = json::parse(req.body);
        const fs::path fspath { body["path"] };
        const std::string fileExtension { fspath.extension() };

        if (fileExtension == ".mp3") {
            CROW_LOG_ERROR << fileExtension << " is not supported";
            return crow::response { 500, "Not supported" };
        }

        if (const auto it = body.find("fieldType"); it != body.end()) {
            return FLAC::addMusicTag(body["path"], body["fieldType"], body["value"]);
        } else {
            CROW_LOG_ERROR << "(api/addfieldtag) fieldType not found!";
            return crow::response { 500, "fieldType not found" };
        }
    });

    CROW_ROUTE(app, "/api/removefieldtag").methods("POST"_method)
    ([&](const crow::request &req) {
        const ordered_json body = json::parse(req.body);
        const fs::path fspath { body["path"] };
        const std::string fileExtension { fspath.extension() };
        if (fileExtension == ".mp3") {
            CROW_LOG_ERROR << fileExtension << " is not supported";
            return crow::response { 500, ".mp3 is not supported" };
        }

        if (const auto it = body.find("fieldType"); it != body.end()) {
            return FLAC::removeMusicTag(body["path"], body["fieldType"]);
        } else {
            CROW_LOG_ERROR << "(api/removefieldtag) fieldType not found!";
            return crow::response { 500, "fieldType not found" };
        }
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
        const std::string dir { body["path"].get<std::string>() + "/" + body["name"].get<std::string>() };
        if (fs::exists(dir)) {
            std::cerr << "Error: The specified directory already exist\n";
            return crow::response { 500, "Error: The specified directory already exist" };
        }
        fs::create_directory(dir);
        return crow::response{ 200 };
    });

    CROW_ROUTE(app, "/api/tag").methods("GET"_method)
    ([&](const crow::request &req) {
        const char* p = req.url_params.get("path");
        if (!p) {
            return crow::response(400, "missing path param");
        }

        const std::string filePath = p;
        CROW_LOG_INFO << "(api/tag) Requested filepath: " << filePath;
        const json tags = listTags(filePath);

        crow::response response(tags.dump());
        response.set_header("Content-Type", "application/json");
        return response;
    });

    // This endpoint returns a JSON response of directories and files of requested directory
    // The structure of the response is the following:
    /*
        {
            "name": "music",
            "type": "directory",
            "content": [
                {
                    "name": ".cache",
                    "type": "directory",
                    "content": []
                },
                {
                    "name": ".config",
                    "type": "directory",
                    "content": []
                },
            ...
        }
    */
    // TODO:
    // Add security feature to check whatever requested directory is a mounted directory (should not return, for example /usr/bin/)
    CROW_ROUTE(app, "/api/list").methods("GET"_method, "OPTIONS"_method)
    ([&] (const crow::request &req){
        std::string requestPath = req.url_params.get("path");

        // Remove trailing slash for buildMainDirectoryTree
        if (requestPath.ends_with('/')) {
            requestPath.pop_back();
        }
        CROW_LOG_DEBUG << "[/api/list] Building tree for: " << requestPath;
        const auto directoryTree = buildMainDirectoryTree(requestPath, DIR_DEPTH::ARTIST);
        crow::response response(directoryTree.dump());
        response.set_header("Content-Type", "application/json");

        return response;
    });

    app.loglevel(crow::LogLevel::WARNING);
    app.port(18080).multithreaded().run();

    return 0;
}