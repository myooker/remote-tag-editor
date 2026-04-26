//
// Created by myooker on 1/27/26.
//

#ifndef WEB_TAG_EDITOR_MPEG4TAGHANDLER_H
#define WEB_TAG_EDITOR_MPEG4TAGHANDLER_H

#include <tstring.h>

#include "../../include/musicTagHandler.h"

namespace audioFormat {
    class mpeg4TagHandler : public musicTagHandler {
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        static void addUserDefinedAtom(const program::TagModification &tagStruct);
        crow::response removeMusicTag(const program::TagModification &tagStruct) override;
        crow::response addMusicTag(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct) override;
        std::expected<std::string, bool> hasRTEID(const std::string &filePath) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_MPEG4TAGHANDLER_H