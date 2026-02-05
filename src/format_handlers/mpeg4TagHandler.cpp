//
// Created by myooker on 1/27/26.
//

#include "../../include/format_handlers/mpeg4TagHandler.h"
#include <mp4file.h>

using namespace audioFormat;

atomEntity mpeg4TagHandler::atomToString(const std::string &atom) {
    const std::unordered_map<std::string, atomEntity> atomMap = {
        {"©alb", {"ALBUM", "text"}},
        {"©art", {"ARTIST", "text"}},
        {"aART", {"ALBUM ARTIST", "text"}},
        {"©cmt", {"COMMENT", "text"}},
        {"©day", {"YEAR", "text"}},
        {"©nam", {"TITLE", "text"}},

        {"©gen", {"GENRE", "text|uint8"}}, // ©gen or gnre
        {"gnre", {"GENRE", "uint8"}},

        {"trkn", {"TRACK NUMBER", "uint8"}},
        {"disk", {"DISK NUMBER", "uint8"}},

        {"©wrt", {"COMPOSER", "text"}},
        {"©too", {"ENCODER", "text"}},
        {"tmpo", {"BPM", "uint8"}},
        {"©cprt", {"COPYRIGHT", "text"}},
        {"cpil", {"COMPILATION", "uint8"}},

        {"covr", {"ARTWORK", "jpeg|png"}},

        {"rtng", {"RATING/ADVISORY", "uint8"}},
        {"©grp", {"GROUPING", "text"}},
        {"stik", {"MEDIA TYPE (STIK)", "uint8"}},

        {"pcst", {"PODCAST", "uint8"}},
        {"catg", {"CATEGORY", "text"}},
        {"keyw", {"KEYWORD", "text"}},
        {"purl", {"PODCAST URL", "text"}},
        {"egid", {"EPISODE GLOBAL UNIQUE ID", "text"}},

        {"desc", {"DESCRIPTION", "text"}},
        {"©lyr", {"LYRICS", "text"}},
        {"purd", {"PURCHASE DATE", "text"}},
        {"pgap", {"GAPLESS PLAYBACK", "uint8"}}
    };

    if (const auto it = atomMap.find(atom); it != atomMap.end()) {
        return it->second;
    } else {
        return {"UNKNOWN", "UNKNOWN"};
    }
}

std::expected<json, std::string> mpeg4TagHandler::listMusicTags(const std::string &filePath) {
    TagLib::MP4::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected(filePath + " is not valid");
    }

    json base = json::object();

    const auto tag = file.tag();
    const auto map = tag->itemMap();

    for (const auto &pair : map) {
        const auto key = pair.first;
        const auto value = pair.second;

        const std::string humanKey { atomToString(key.toCString(true)).name };

        if (atomToString(key.toCString()).flag == "uint8") {
            base[humanKey] = value.toInt();
            continue;
        } if (atomToString(key.toCString()).name == "ARTWORK") {
            continue;
        } if (key == "disk" || key == "trkn") {
            const auto int_pair = value.toIntPair();
            base[humanKey] = {
                {"current", int_pair.first},
                {"total", int_pair.second}
            };
            continue;
        }

        base[humanKey] = value.toStringList().toString().toCString(true);
    }

    return base;
}

crow::response mpeg4TagHandler::removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    return {200, "Not implemented"};
}

crow::response mpeg4TagHandler::addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    return {200, "Not implemented"};
}

crow::response mpeg4TagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) {
    return {200, "Not implemented"};
}