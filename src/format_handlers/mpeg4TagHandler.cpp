//
// Created by myooker on 1/27/26.
//

#include "mpeg4TagHandler.h"
#include <mp4file.h>

using namespace audioFormat;

atomEntity mpeg4TagHandler::atomToString(const std::string &atom) {
    CROW_LOG_DEBUG << "(" << __func__ << ") atom: " << atom;
    const static std::unordered_map<std::string, atomEntity> s_atomMap = {
    // TEXT atoms -------------------------------------------------------------
    { "©alb", {"ALBUM",                     atomType::TEXT } },
    { "©art", {"ARTIST",                    atomType::TEXT } },
    { "aART", {"ALBUM ARTIST",              atomType::TEXT } },
    { "©cmt", {"COMMENT",                   atomType::TEXT } },
    { "©day", {"YEAR",                      atomType::TEXT } },
    { "©nam", {"TITLE",                     atomType::TEXT } },

    // GENRE (both text and numeric forms) -----------------------------------
    { "©gen", {"GENRE",                    atomType::TEXT  } },   // ©gen or gnre
    { "gnre", {"GENRE",                    atomType::UINT8 } },

    // TRACK / DISK numbers ----------------------------------------------------
    { "trkn", {"TRACK NUMBER",             atomType::UINT8 } },
    { "disk", {"DISK NUMBER",              atomType::UINT8 } },

    // Additional TEXT atoms ---------------------------------------------------
    { "©wrt", {"COMPOSER",                 atomType::TEXT } },
    { "©too", {"ENCODER",                  atomType::TEXT } },
    { "tmpo", {"BPM",                      atomType::UINT8 } },
    { "©cprt",{"COPYRIGHT",                 atomType::TEXT } },
    { "cpil", {"COMPILATION",              atomType::UINT8 } },

    // PICTURE atom ------------------------------------------------------------
    { "covr", {"ARTWORK",                  atomType::PICTURE } },

    // UINT8 atoms -------------------------------------------------------------
    { "rtng", {"RATING/ADVISORY",          atomType::UINT8 } },
    { "©grp", {"GROUPING",                 atomType::TEXT } },
    { "stik", {"MEDIA TYPE (STIK)",        atomType::UINT8 } },

    // PODCAST related ---------------------------------------------------------
    { "pcst", {"PODCAST",                  atomType::UINT8 } },
    { "catg", {"CATEGORY",                 atomType::TEXT } },
    { "keyw", {"KEYWORD",                  atomType::TEXT } },
    { "purl", {"PODCAST URL",              atomType::TEXT } },
    { "egid", {"EPISODE GLOBAL UNIQUE ID", atomType::TEXT } },

    // Remaining TEXT / UINT8 atoms ------------------------------------------
    { "desc", {"DESCRIPTION",               atomType::TEXT } },
    { "©lyr", {"LYRICS",                   atomType::TEXT } },
    { "purd", {"PURCHASE DATE",             atomType::TEXT } },
    { "pgap", {"GAPLESS PLAYBACK",          atomType::UINT8 } }
    };

    if (const auto it = s_atomMap.find(atom); it != s_atomMap.end()) {
        return it->second;
    } else {
        return {"unkn", atomType::UNDEFINED};
    }
}

TagLib::String mpeg4TagHandler::stringToAtom(const std::string &atom) {
    const static std::unordered_map<std::string, TagLib::String> s_atomMap = {
        // TEXT atoms -------------------------------------------------------
        {"ALBUM",                {"©alb",          TagLib::String::UTF8}},
        {"ARTIST",               {"©art",          TagLib::String::UTF8}},
        {"ALBUM ARTIST",         {"aART",          TagLib::String::UTF8}},
        {"COMMENT",              {"©cmt",          TagLib::String::UTF8}},
        {"YEAR",                 {"©day",          TagLib::String::UTF8}},
        {"TITLE",                {"©nam",          TagLib::String::UTF8}},
        {"GENRE",                {"©gen",          TagLib::String::UTF8}},   // text form
        {"COMPOSER",             {"©wrt",          TagLib::String::UTF8}},
        {"ENCODER",              {"©too",          TagLib::String::UTF8}},
        {"COPYRIGHT",            {"©cprt",         TagLib::String::UTF8}},
        {"GROUPING",             {"©grp",          TagLib::String::UTF8}},
        {"CATEGORY",             {"catg",          TagLib::String::UTF8}},
        {"KEYWORD",              {"keyw",          TagLib::String::UTF8}},
        {"PODCAST URL",          {"purl",          TagLib::String::UTF8}},
        {"EPISODE GLOBAL UNIQUE ID", {"egid",      TagLib::String::UTF8}},
        {"DESCRIPTION",          {"desc",          TagLib::String::UTF8}},
        {"LYRICS",               {"©lyr",          TagLib::String::UTF8}},
        {"PURCHASE DATE",        {"purd",          TagLib::String::UTF8}},

        // UINT8 atoms ------------------------------------------------------
        {"GENRE (uint8)",        {"gnre",          TagLib::String::UTF8}},   // numeric form
        {"TRACK NUMBER",         {"trkn",          TagLib::String::UTF8}},
        {"DISK NUMBER",          {"disk",          TagLib::String::UTF8}},
        {"COMPILATION",          {"cpil",          TagLib::String::UTF8}},
        {"BPM",                  {"tmpo",          TagLib::String::UTF8}},
        {"RATING/ADVISORY",      {"rtng",          TagLib::String::UTF8}},
        {"MEDIA TYPE (STIK)",    {"stik",          TagLib::String::UTF8}},
        {"PODCAST",              {"pcst",          TagLib::String::UTF8}},
        {"GAPLESS PLAYBACK",     {"pgap",          TagLib::String::UTF8}},

        // PICTURE atom -----------------------------------------------------
        {"ARTWORK",              {"covr",          TagLib::String::UTF8}}
    };

    if (const auto it = s_atomMap.find(atom); it != s_atomMap.end()) {
        return it->second;
    } else {
        return TagLib::String{ "Unknown", TagLib::String::UTF8 };
    }
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

        const std::string humanKey { atomToString(key.toCString(true)).name };
        const auto currentFlag { atomToString(key.toCString(true)).flag };
        CROW_LOG_DEBUG << "(" << __func__ << ") " << key << " : " << currentFlag;

        switch (currentFlag) {
            case atomType::TEXT: {
                base[humanKey] = value.toStringList().toString().toCString(true);
                continue;
            }
            case atomType::UINT8: {
                base[humanKey] = value.toInt();
                continue;
            }
            case atomType::PICTURE:
                CROW_LOG_INFO << "(" << __func__ << ") atomType::PICTURE is not implemented";
                continue;
            case atomType::UNDEFINED:
                CROW_LOG_ERROR << "(" << __func__ << ") atomType::UNDEFINED is not implemented";
                continue;
            default:
                CROW_LOG_CRITICAL << "(" << __func__ << ") Something went completely wrong uwu...";
                return std::string{"switch (currentFlag) default case uwu..."};
        }
    }

    return base;
}

crow::response mpeg4TagHandler::removeMusicTag(const program::TagModification &tagStruct) {
    TagLib::MP4::File file { tagStruct.filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath << " is not valid";
        return {500, "Not valid"};
    }

    if (!file.hasMP4Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath << " does not have mp4 tags";
        return {500, "does not have mp4 tags"};
    }

    auto *tag = file.tag();
    //tag->removeItem(TagLib::String(fieldType, TagLib::String::UTF8));
    tag->removeItem(stringToAtom(tagStruct.fieldType));

    file.save();

    return {200, "OK"};
}

crow::response mpeg4TagHandler::addMusicTag(const program::TagModification &tagStruct) {
    TagLib::MP4::File file { tagStruct.filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath << " is not valid";
        return {500, "Not valid"};
    }

    if (!file.hasMP4Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath << " does not have mp4 tags";
        return {500, "does not have mp4 tags"};
    }

    auto *tag = file.tag();
    const auto fieldTypeTS = stringToAtom(tagStruct.fieldType);
    CROW_LOG_DEBUG << "(" << __func__ << ") fieldTypeTS: " << fieldTypeTS;
    const auto type = atomToString(stringToAtom(tagStruct.fieldType).toCString(true)).flag;
    switch (type) {
        case atomType::TEXT: {
            const TagLib::StringList tags { TagLib::String{ tagStruct.value, TagLib::String::UTF8 } };
            const TagLib::MP4::Item temp(tags.toString());
            tag->setItem(fieldTypeTS, temp);
            file.save();
            CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.filePath << " has been saved!";
            return {200, "OK"};
        }
        case atomType::UINT8: {
            const TagLib::MP4::Item mp4ItemTemp(std::stoi(tagStruct.value));
            tag->setItem(fieldTypeTS, mp4ItemTemp);
            file.save();
            CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.filePath << " has been saved!";
            return {200, "OK"};
        }
        case atomType::PICTURE:
            CROW_LOG_DEBUG << "(" << __func__ << ") Not implemented";
            return {200, "Not implemented"};
        case atomType::UNDEFINED:
            CROW_LOG_ERROR << "(" << __func__ << ") The specified fieldType fallback to atomType::UNDEFINED: ";
            CROW_LOG_ERROR << "(" << __func__ << ") fieldType: " << tagStruct.fieldType;
            CROW_LOG_ERROR << "(" << __func__ << ") fieldTypeTS: " << fieldTypeTS;
            return {500, "Not valid"};
        default:
            CROW_LOG_CRITICAL << "(" << __func__ << ") Something went wrong!";
            return {500, "Not valid"};
    }
}

crow::response mpeg4TagHandler::editMusicTags(const program::TagModification &tagStruct) {
    return addMusicTag(tagStruct);
}