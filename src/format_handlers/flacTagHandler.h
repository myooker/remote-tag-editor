//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_FLACTAGHANDLER_H
#define WEB_TAG_EDITOR_FLACTAGHANDLER_H

#include "../../include/musicTagHandler.h"
#include "../../include/program.h"

namespace audioFormat {
    class flacTagHandler : public musicTagHandler {
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct) override;
        crow::response addMusicTag(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct) override;
        std::expected<std::string, bool> hasRTEID(const std::string &filePath) override;
    };
}

#endif //WEB_TAG_EDITOR_FLACTAGHANDLER_H