//
// Created by myooker on 1/27/26.
//

#include "mpeg4TagHandler.h"
#include "../../include/music.h"
#include <mp4file.h>

using namespace audioFormat;

void mpeg4TagHandler::ensureRteid(std::string* rteid, TagLib::MP4::Tag* tag) {
    using namespace program::music;
    using namespace TagLib;

    const String rteAtom { std::string(prefix::m4a) + tag::rteID.data() };
    const auto it = tag->itemMap().find(rteAtom);
    if (it != tag->itemMap().end())
        *rteid = it->second.toStringList()[0].toCString(false);
    else
        tag->setItem(rteAtom, MP4::Item{StringList{String{*rteid, String::UTF8}}});
}

std::expected<json, std::string> mpeg4TagHandler::listMusicTags(const std::string &filePath) {
    using namespace program::music;
    const TagLib::MP4::File file { filePath.c_str() };
    using Type = TagLib::MP4::Item::Type;

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
        switch (value.type()) {
            case Type::StringList: {
                    for (const auto &x : value.toStringList()) {
                        base[key.to8Bit(true)] += x.toCString(true);
                    }
                    break;
                }
            case Type::Int:
                base[key.to8Bit(true)] = value.toInt();
                break;
            case Type::IntPair: {
                const auto [first, second] = value.toIntPair();
                base[key.to8Bit(true)] = std::to_string(first) + "/" + std::to_string(second);
                break;
            }
            case Type::Bool:
                base[key.to8Bit(true)] = value.toBool();
                break;
            case Type::UInt:
                base[key.to8Bit(true)] = value.toUInt();
                break;
            case Type::LongLong:
                base[key.to8Bit(true)] = value.toLongLong();
                break;
            case Type::Byte:
                base[key.to8Bit(true)] = value.toByte();
                break;
            case Type::ByteVectorList:
            case Type::CoverArtList:
            case Type::Stem:
            case Type::Void:
                CROW_LOG_WARNING << __PRETTY_FUNCTION__ << " atom type is not implemented";
                break;
        }
    }

    return base;
}

crow::response mpeg4TagHandler::removeMusicTag(const program::TagModification &tagStruct, std::string *rteid) {
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

    tag->removeItem(TagLib::String{tagStruct.fieldType, TagLib::String::UTF8});

    if (rteid) ensureRteid(rteid, tag);
    file.save();

    return {200, "OK"};
}

crow::response mpeg4TagHandler::addMusicTag(const program::TagModification &tagStruct, std::string *rteid) {
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
    const TagLib::String atomKey { tagStruct.fieldType, TagLib::String::UTF8 };

    const auto &itemMap = tag->itemMap();
    const auto existingIt = itemMap.find(atomKey);
    const auto targetType = existingIt != itemMap.end()
        ? existingIt->second.type()
        : TagLib::MP4::Item::Type::StringList;

    switch (targetType) {
        using namespace TagLib::MP4;
        case Item::Type::StringList: {
            const Item item { TagLib::StringList{ tagStruct.value } };
            tag->setItem(atomKey, item);
            break;
        }
        case Item::Type::Int: {
            const Item item { std::stoi(tagStruct.value.toCString())};
            tag->setItem(atomKey, item);
            break;
        }
        case Item::Type::IntPair: {
            const auto sep = tagStruct.value.find('/');
            if (sep != std::string::npos) {
                const int first = std::stoi(tagStruct.value.to8Bit().substr(0, sep));
                const int second = std::stoi(tagStruct.value.to8Bit().substr(sep + 1));
                tag->setItem(atomKey, Item(first, second));
            } else {
                tag->setItem(atomKey, Item(std::stoi(tagStruct.value.toCString())));
            }
            break;
        }
        case Item::Type::Bool: {
            tag->setItem(atomKey, Item(tagStruct.value == "1" || tagStruct.value == "true"));
            break;
        }
        case Item::Type::UInt: {
            tag->setItem(atomKey, Item(static_cast<unsigned int>(std::stoul(tagStruct.value.toCString()))));
            break;
        }
        case Item::Type::LongLong: {
            tag->setItem(atomKey, Item(std::stoll(tagStruct.value.toCString())));
            break;
        }
        case Item::Type::Byte: {
            tag->setItem(atomKey, Item(static_cast<unsigned char>(std::stoi(tagStruct.value.toCString()))));
            break;
        }
        default:
            return { 400, "Not implemented method" };
    }

    if (rteid) ensureRteid(rteid, tag);
    if (file.save()) {
        CROW_LOG_INFO << __PRETTY_FUNCTION__ << ": " << tagStruct.filePath << " has been saved!";
        return { 200, "OK" };
    } else {
        CROW_LOG_INFO << __PRETTY_FUNCTION__ << ": " << tagStruct.filePath << " has not been saved :(";
        return { 500, "Has not been saved" };
    }
}

crow::response mpeg4TagHandler::editMusicTags(const program::TagModification &tagStruct, std::string *rteid) {
    auto modified = tagStruct;
    modified.value = tagStruct.replaceWith;
    return addMusicTag(modified, rteid);
}