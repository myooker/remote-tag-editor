//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLER_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLER_H

#include <filesystem>
#include <string>
#include <expected>
#include <crow/http_response.h>
#include <nlohmann/json.hpp>

namespace fs = std::filesystem;
using json = nlohmann::json;
using ordered_json = nlohmann::ordered_json;

class musicTagHandler {
public:
    virtual ~musicTagHandler() = default;

    virtual std::expected<json, std::string> listMusicTags(const std::string &filePath) = 0;
    virtual crow::response removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) = 0;
    virtual crow::response addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) = 0;
    virtual crow::response editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) = 0;
    virtual crow::response editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith) {
        return { 501, "Multi-valued editing is not supported for this format"};
    };
    virtual crow::response getAlbumCover(const std::string &filePath) {
        return { 501, "Returning an album cover from a file is not supported"};
    }
    virtual crow::response removeAlbumCover(const std::string &filePath) {
        return { 501, "Removing an album cover from a file is not supported"};
    }
    virtual crow::response addAlbumCover(const std::string &filePath) {
        return { 501, "Adding an album cover from a file is not supported"};
    }
};


#endif //WEB_TAG_EDITOR_MUSICTAGHANDLER_H