//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_FLACTAGHANDLER_H
#define WEB_TAG_EDITOR_FLACTAGHANDLER_H

#include "../musicTagHandler.h"

namespace audioFormat {
    class flacTagHandler : public musicTagHandler {
    public:
        json listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) override;
        crow::response addMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) override;
        crow::response editMusicTags(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &replaceWith) override;
        crow::response editMusicTags(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith) override;
    };
}

#endif //WEB_TAG_EDITOR_FLACTAGHANDLER_H