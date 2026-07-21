//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLER_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLER_H

#include <filesystem>
#include <string>
#include <expected>
#include <flacfile.h>
#include <crow/http_response.h>
#include <nlohmann/json.hpp>
#include "program.h"
#include "music.h"

namespace fs = std::filesystem;
using json = nlohmann::json;
using ordered_json = nlohmann::ordered_json;
using namespace program::music;

class musicTagHandler {
public:
    virtual ~musicTagHandler() = default;

    virtual std::expected<json, std::string> listMusicTags(const std::string &filePath) = 0;
    virtual crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) = 0;
    virtual crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) = 0;
    virtual crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) = 0;
    virtual crow::response editMusicTags(const program::TagModification &tagStruct, bool isBulk) {
        return { 501, "Multi-valued editing is not supported for this format"};
    };
    virtual tag::Picture getAlbumCover(const std::string &filePath) {
        return { crow::response { 501, "Retrieving an album cover from a file is not supported" } };
    }
    virtual crow::response removeAlbumCover(const std::string &filePath) {
        return { 501, "Removing an album cover from a file is not supported"};
    }
    virtual crow::response addAlbumCover(const std::string &filePath) {
        return { 501, "Adding an album cover from a file is not supported"};
    }
};


#endif //WEB_TAG_EDITOR_MUSICTAGHANDLER_H