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

class ImusicTagHandler {
public:
    virtual ~ImusicTagHandler() = default;

    virtual std::expected<json, std::string> listMusicTags(const std::string &filePath) = 0;
    virtual crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) = 0;
    virtual crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) = 0;
    virtual crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) = 0;
    virtual tag::Picture getAlbumCover(const std::string &filePath) = 0;
    virtual void removeAlbumCover(const std::string &filePath) = 0;
    virtual void addAlbumCover(const std::string &filePath) = 0;
};


#endif //WEB_TAG_EDITOR_MUSICTAGHANDLER_H