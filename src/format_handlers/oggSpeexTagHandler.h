//
// Created by myooker on 2/10/26.
//

#ifndef WEB_TAG_EDITOR_OGGSPEEXTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGSPEEXTAGHANDLER_H
#include "../../include/musicTagHandler.h"

namespace audioFormat {
    class oggSpeexTagHandler : public musicTagHandler {
    private:
        void ensureRteid(std::string *rteid, TagLib::Ogg::XiphComment *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_OGGSPEEXTAGHANDLER_H