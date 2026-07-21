//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_FLACTAGHANDLER_H
#define WEB_TAG_EDITOR_FLACTAGHANDLER_H

#include "../../include/music.h"
#include "../../include/musicTagHandler.h"
#include "../../include/program.h"

namespace audioFormat {
    class flacTagHandler : public musicTagHandler {
    private:
        static void ensureRteid(std::string *rteid, TagLib::Ogg::XiphComment *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override;
    };
}

#endif //WEB_TAG_EDITOR_FLACTAGHANDLER_H