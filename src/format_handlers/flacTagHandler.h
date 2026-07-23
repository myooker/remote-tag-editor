//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_FLACTAGHANDLER_H
#define WEB_TAG_EDITOR_FLACTAGHANDLER_H

#include "../../include/music.h"
#include "../../include/ImusicTagHandler.h"
#include "../../include/program.h"

namespace audioFormat {
    class flacTagHandler : public ImusicTagHandler {
    private:
        static void ensureRteid(std::string *rteid, TagLib::Ogg::XiphComment *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override;
        void removeAlbumCover(const std::string& filePath) override {};
        void addAlbumCover(const std::string& filePath) override {};
    };
}

#endif //WEB_TAG_EDITOR_FLACTAGHANDLER_H