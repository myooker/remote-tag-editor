//
// Created by myooker on 1/27/26.
//

#ifndef WEB_TAG_EDITOR_MPEG4TAGHANDLER_H
#define WEB_TAG_EDITOR_MPEG4TAGHANDLER_H

#include <mp4coverart.h>
#include <mp4tag.h>
#include <tstring.h>

#include "../../include/musicTagHandler.h"

namespace audioFormat {
    class mpeg4TagHandler : public musicTagHandler {
    private:
        static void ensureRteid(std::string *rteid, TagLib::MP4::Tag *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        static void addUserDefinedAtom(const program::TagModification &tagStruct);
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_MPEG4TAGHANDLER_H