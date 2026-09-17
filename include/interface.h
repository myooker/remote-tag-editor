#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLER_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLER_H

#include <string>
#include <expected>
#include <crow/http_response.h>
#include <nlohmann/json.hpp>
#include "rte.h"
#include "music.h"

namespace fs = std::filesystem;
using json = nlohmann::json;

namespace rte::music::handler {
    class Interface {
        public:
        virtual
        ~Interface() = default;

        virtual std::expected<json, std::string> listMusicTags(const std::string& filePath) = 0;
        virtual crow::response removeMusicTag(const TagModification& tagStruct, std::string* rteid = nullptr) = 0;
        virtual crow::response addMusicTag(const TagModification& tagStruct, std::string* rteid = nullptr) = 0;
        virtual crow::response editMusicTags(const TagModification& tagStruct, std::string* rteid = nullptr) = 0;
        virtual tag::Picture getAlbumCover(const std::string& filePath) = 0;
        virtual void removeAlbumCover(const std::string& filePath) = 0;
        virtual void addAlbumCover(const std::string& filePath) = 0;
        virtual std::expected<std::string, std::string> resolveTag(std::string_view tag) = 0;
    };
}


#endif //WEB_TAG_EDITOR_MUSICTAGHANDLER_H