//
// Created by myooker on 2/10/26.
//

#ifndef WEB_TAG_EDITOR_OGGTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGTAGHANDLER_H

#include "../../include/musicTagHandler.h"

namespace audioFormat {
    class oggTagHandler : public musicTagHandler {
    private:
        std::string m_filePath{};
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct) override;
        crow::response addMusicTag(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, bool isBulk) override;
    private:
        std::unique_ptr<musicTagHandler> codecHandler(const std::string &filePath);
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_OGGTAGHANDLER_H