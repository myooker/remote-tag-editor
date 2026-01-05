//
// Created by myooker on 1/1/26.
//

#ifndef WEB_TAG_EDITOR_FLAC_H
#define WEB_TAG_EDITOR_FLAC_H

#include <flacfile.h>
#include <mpegfile.h>
#include <id3v2tag.h>
#include <taglib/xiphcomment.h>
#include <textidentificationframe.h>
#include <unordered_set>
#include <crow/http_response.h>
#include <nlohmann/json.hpp>

namespace FLAC {
    nlohmann::json listMusicTags(const std::string &path);
    crow::response removeMusicTag(const std::string &path, const std::string &fieldType);
    crow::response addMusicTag(const std::string &path, const std::string &fieldType, const std::string &value);
    crow::response editMusicTags(const std::string &path, const std::string &fieldType, const std::string &replaceWith);
    crow::response editMusicTags(const std::string &path, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith);
}

#endif //WEB_TAG_EDITOR_FLAC_H