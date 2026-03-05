//
// Created by myooker on 1/27/26.
//

#include "mpeg4TagHandler.h"
#include "../../include/music.h"
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
    using namespace program::music;
    const TagLib::MP4::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected(filePath + " is not valid");
    }

    if (!file.hasMP4Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have mp4 tags";
        return std::unexpected(filePath + " does not have mp4 tags");
    }

    json base = json::object();

    const auto mp4tag = file.tag();
    const auto &map = mp4tag->itemMap();

    for (const auto &[key, value] : map) {
        const std::string normalizedKey = tag::normalize(key.toCString(true));
        CROW_LOG_DEBUG << "(" << __func__ << ") " << key << " -> " << normalizedKey;

        switch (value.type()) {
            case TagLib::MP4::Item::Type::StringList:
                base[normalizedKey] = value.toStringList().toString().toCString(true);
                break;
            case TagLib::MP4::Item::Type::Int:
                base[normalizedKey] = value.toInt();
                break;
            case TagLib::MP4::Item::Type::IntPair: {
                const auto [first, second] = value.toIntPair();
                base[normalizedKey] = std::to_string(first) + "/" + std::to_string(second);
                break;
            }
            case TagLib::MP4::Item::Type::Bool:
                base[normalizedKey] = value.toBool();
                break;
            case TagLib::MP4::Item::Type::UInt:
                base[normalizedKey] = value.toUInt();
                break;
            case TagLib::MP4::Item::Type::LongLong:
                base[normalizedKey] = value.toLongLong();
                break;
            case TagLib::MP4::Item::Type::Byte:
                base[normalizedKey] = static_cast<int>(value.toByte());
                break;
            case TagLib::MP4::Item::Type::ByteVectorList:
                CROW_LOG_DEBUG << "(" << __func__ << ") ByteVectorList skipped for: " << normalizedKey;
                break;
            case TagLib::MP4::Item::Type::CoverArtList:
                CROW_LOG_DEBUG << "(" << __func__ << ") CoverArtList skipped for: " << normalizedKey;
                break;
            case TagLib::MP4::Item::Type::Stem:
                CROW_LOG_DEBUG << "(" << __func__ << ") Stem skipped for: " << normalizedKey;
                break;
            case TagLib::MP4::Item::Type::Void:
                CROW_LOG_DEBUG << "(" << __func__ << ") Void item for: " << normalizedKey;
                break;
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
    using namespace program::music;
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
    const std::string rawAtom = tag::denormalize(tagStruct.fieldType, format::M4A);
    const TagLib::String atomKey { rawAtom, TagLib::String::UTF8 };

    const auto &itemMap = tag->itemMap();
    const auto existingIt = itemMap.find(atomKey);
    const auto targetType = existingIt != itemMap.end()
        ? existingIt->second.type()
        : TagLib::MP4::Item::Type::StringList;

    switch (targetType) {
        using namespace TagLib::MP4;
        case Item::Type::StringList: {
            const Item item { TagLib::StringList{TagLib::String{tagStruct.value, TagLib::String::UTF8}} };
            tag->setItem(atomKey, item);
            break;
        }
        case Item::Type::Int: {
            const Item item { std::stoi(tagStruct.value)};
            tag->setItem(atomKey, item);
            break;
        }
        case Item::Type::IntPair: {
            const auto sep = tagStruct.value.find('/');
            if (sep != std::string::npos) {
                const int first = std::stoi(tagStruct.value.substr(0, sep));
                const int second = std::stoi(tagStruct.value.substr(sep + 1));
                tag->setItem(atomKey, Item(first, second));
            } else {
                tag->setItem(atomKey, Item(std::stoi(tagStruct.value)));
            }
            break;
        }
        case Item::Type::Bool: {
            tag->setItem(atomKey, Item(tagStruct.value == "1" || tagStruct.value == "true"));
            break;
        }
        case Item::Type::UInt: {
            tag->setItem(atomKey, Item(static_cast<unsigned int>(std::stoul(tagStruct.value))));
            break;
        }
        case Item::Type::LongLong: {
            tag->setItem(atomKey, Item(std::stoll(tagStruct.value)));
            break;
        }
        case Item::Type::Byte: {
            tag->setItem(atomKey, Item(static_cast<unsigned char>(std::stoi(tagStruct.value))));
            break;
        }
        case Item::Type::CoverArtList:
            CROW_LOG_DEBUG << "(" << __func__ << ") CoverArtList not implemented";
            return {501, "CoverArtList not implemented"};
        case Item::Type::ByteVectorList:
            CROW_LOG_DEBUG << "(" << __func__ << ") ByteVectorList not implemented";
            return {501, "ByteVectorList not implemented"};
        case Item::Type::Stem:
            CROW_LOG_DEBUG << "(" << __func__ << ") Stem not implemented";
            return {501, "Stem not implemented"};
        case Item::Type::Void:
            CROW_LOG_ERROR << "(" << __func__ << ") Void atom type for: " << rawAtom;
            return {500, "Void atom type"};
    }

    if (file.save()) {
        CROW_LOG_INFO << __PRETTY_FUNCTION__ << ": " << tagStruct.filePath << " has been saved!";
        return { 200, "OK" };
    } else {
        CROW_LOG_INFO << __PRETTY_FUNCTION__ << ": " << tagStruct.filePath << " has not been saved :(";
        return { 500, "Has not been saved" };
    }
}

crow::response mpeg4TagHandler::editMusicTags(const program::TagModification &tagStruct) {
    return addMusicTag(tagStruct);
}