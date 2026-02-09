//
// Created by myooker on 1/27/26.
//

#include "../../include/format_handlers/mpeg4TagHandler.h"
#include <mp4file.h>

using namespace audioFormat;

atomEntity mpeg4TagHandler::atomToString(const std::string &atom) {
    const std::unordered_map<std::string, atomEntity> atomMap = {
        {"©alb", {"ALBUM", atomType::TEXT }},
        {"©art", {"ARTIST", atomType::TEXT}},
        {"aART", {"ALBUM ARTIST", atomType::TEXT}},
        {"©cmt", {"COMMENT", atomType::TEXT}},
        {"©day", {"YEAR", atomType::TEXT}},
        {"©nam", {"TITLE", atomType::TEXT}},

        {"©gen", {"GENRE", atomType::TEXT}}, // ©gen or gnre
        {"gnre", {"GENRE", atomType::UINT8}},

        {"trkn", {"TRACK NUMBER", atomType::UINT8}},
        {"disk", {"DISK NUMBER", atomType::UINT8}},

        {"©wrt", {"COMPOSER", atomType::TEXT}},
        {"©too", {"ENCODER", atomType::TEXT}},
        {"tmpo", {"BPM", atomType::UINT8}},
        {"©cprt", {"COPYRIGHT", atomType::TEXT}},
        {"cpil", {"COMPILATION", atomType::UINT8}},

        {"covr", {"ARTWORK", atomType::PICTURE}},

        {"rtng", {"RATING/ADVISORY", atomType::UINT8}},
        {"©grp", {"GROUPING", atomType::TEXT}},
        {"stik", {"MEDIA TYPE (STIK)", atomType::UINT8}},

        {"pcst", {"PODCAST", atomType::UINT8}},
        {"catg", {"CATEGORY", atomType::TEXT}},
        {"keyw", {"KEYWORD", atomType::TEXT}},
        {"purl", {"PODCAST URL", atomType::TEXT}},
        {"egid", {"EPISODE GLOBAL UNIQUE ID", atomType::TEXT}},

        {"desc", {"DESCRIPTION", atomType::TEXT}},
        {"©lyr", {"LYRICS", atomType::TEXT}},
        {"purd", {"PURCHASE DATE", atomType::TEXT}},
        {"pgap", {"GAPLESS PLAYBACK", atomType::UINT8}}
    };

    if (const auto it = atomMap.find(atom); it != atomMap.end()) {
        return it->second;
    } else {
        return {"unkn", atomType::UNDEFINED};
    }
}

std::string mpeg4TagHandler::stringToAtom(const std::string &atom) {
    return "none";
}

std::expected<json, std::string> mpeg4TagHandler::listMusicTags(const std::string &filePath) {
    const TagLib::MP4::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected(filePath + " is not valid");
    }

    if (!file.hasMP4Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does ";
    }

    json base = json::object();

    const auto tag = file.tag();
    const auto map = tag->itemMap();

    for (const auto &pair : map) {
        const auto key = pair.first;
        const auto value = pair.second;

        // const std::string humanKey { atomToString(key.toCString(true)).name };
        const std::string humanKey { key.toCString(true) };

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
    TagLib::MP4::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return {500, "Not valid"};
    }

    if (!file.hasMP4Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have mp4 tags";
        return {500, "does not have mp4 tags"};
    }

    auto *tag = file.tag();
    tag->removeItem(TagLib::String(fieldType, TagLib::String::UTF8));

    file.save();

    return {200, "OK"};
}

crow::response mpeg4TagHandler::addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    TagLib::MP4::File file { filePath.c_str() };

    if (file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return {500, "Not valid"};
    }

    if (!file.hasMP4Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have mp4 tags";
        return {500, "does not have mp4 tags"};
    }

    auto *tag = file.tag();
    const TagLib::String fieldTypeT { fieldType, TagLib::String::UTF8 };
    const auto type = atomToString(fieldType).flag;
    switch (type) {
        case atomType::TEXT: {
            const TagLib::StringList tags { TagLib::String{ value, TagLib::String::UTF8 } };
            const TagLib::MP4::Item temp(tags.toString());
            tag->setItem(fieldTypeT, temp);
            file.save();
            return {200, "OK"};
        }
        case atomType::UINT8: {
            const TagLib::MP4::Item mp4ItemTemp(std::stoi(value));
            tag->setItem(fieldTypeT, mp4ItemTemp);
            file.save();
            return {200, "OK"};
        }
        case atomType::PICTURE:
            CROW_LOG_INFO << "(" << __func__ << ") Not implemented";
            return {200, "Not implemented"};
        case atomType::UNDEFINED:
            CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
            return {500, "Not valid"};
        default:
            CROW_LOG_CRITICAL << "(" << __func__ << ") Something went wrong!";
            return {500, "Not valid"};
    }
}

crow::response mpeg4TagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) {
    return {200, "Not implemented"};
}