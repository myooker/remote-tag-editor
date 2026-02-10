//
// Created by myooker on 2/10/26.
//

#ifndef WEB_TAG_EDITOR_OGGFLACTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGFLACTAGHANDLER_H
#include "../musicTagHandler.h"

namespace audioFormat {
    class oggFlacTagHandler : public musicTagHandler {
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) override;
        crow::response addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) override;
        crow::response editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) override;
        crow::response editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith) override;
    };
} // audioFormat

#endif //WEB_TAG_EDITOR_OGGFLACTAGHANDLER_H