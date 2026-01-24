//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MUSICTAGHANDLER_H
#define WEB_TAG_EDITOR_MUSICTAGHANDLER_H

#include <filesystem>
#include <string>
#include <crow/http_response.h>
#include <nlohmann/json.hpp>

namespace fs = std::filesystem;
using json = nlohmann::json;
using ordered_json = nlohmann::ordered_json;

class musicTagHandler {
public:
    virtual ~musicTagHandler() = default;

    virtual json listMusicTags(const std::string &filePath) = 0;
    virtual crow::response removeMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) = 0;
    virtual crow::response addMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) = 0;
    virtual crow::response editMusicTags(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &replaceWith) = 0;
    virtual crow::response editMusicTags(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith) {
        return crow::response{ 501, "Multi-valued editing is not supported for this format"};
    }
};


#endif //WEB_TAG_EDITOR_MUSICTAGHANDLER_H