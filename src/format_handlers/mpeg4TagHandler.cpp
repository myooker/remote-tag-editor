//
// Created by myooker on 1/27/26.
//

#include "mpeg4TagHandler.h"
#include "../../include/music.h"
#include <mp4file.h>

using namespace audioFormat;

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
    using namespace program::music;
    TagLib::MP4::File file { tagStruct.filePath.c_str() };

    std::string rawAtom = tag::denormalize(tagStruct.fieldType, format::M4A);

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

    if (tagStruct.fieldType == rawAtom)
        rawAtom = "----:com.apple.iTunes:" + rawAtom;

    tag->removeItem(TagLib::String{rawAtom, TagLib::String::UTF8});

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
    std::string rawAtom = tag::denormalize(tagStruct.fieldType, format::M4A);

    if (rawAtom == tagStruct.fieldType)
        rawAtom = "----:com.apple.iTunes:" + tagStruct.fieldType;

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