//
// Created by myooker on 2/10/26.
//

#ifndef WEB_TAG_EDITOR_OGGVORBISTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGVORBISTAGHANDLER_H
#include "../../include/musicTagHandler.h"

namespace audioFormat {
    class oggVorbisTagHandler : public musicTagHandler {
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct) override;
        crow::response addMusicTag(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct) override;
        std::expected<std::string, bool> hasRTEID(const std::string &filePath) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_OGGVORBISTAGHANDLER_H