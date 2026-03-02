//
// Created by myooker on 1/24/26.
//

#include "flacTagHandler.h"
#include "../../include/scopeTimer.h"
#include "../../include/music.h"

#include <flacfile.h>
#include <xiphcomment.h>

using namespace audioFormat;

std::expected<json, std::string> flacTagHandler::listMusicTags(const std::string &filePath) {
    TagLib::FLAC::File file { filePath.c_str() };

    scopeTimer scopeTimer { filePath };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected(filePath + " is not valid");
    }

    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have Xiph Comments";
        return std::unexpected(filePath + " does not have Xiph Comments");
    }

    json j;
    const auto tag = file.xiphComment();
    for (const auto &a : tag->fieldListMap()) {
        const std::string key = a.first.to8Bit(true);
        const std::string normalizedKey = program::music::tag::normalize(key);
        if (a.second.size() > 1) {
            const std::size_t temp { a.second.size() };
            for (std::size_t i { 0 }; i < temp; ++i) {
                std::string value { a.second[i].to8Bit(true) };
                j[normalizedKey] += value;
            }
            continue;
        }
        std::string value { a.second[0].to8Bit(true) };
        j[normalizedKey] = value;
    }
    CROW_LOG_DEBUG << "(" << __func__ << ") returning JSON";
    return j;
}

crow::response flacTagHandler::removeMusicTag(const program::TagModification &tagStruct) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, format::FLAC);
    scopeTimer scopeTimer { path.filename().string() };
    TagLib::FLAC::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << path.c_str() << " is not valid";
        return {500, "The file is not valid"};
    }
    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << path.c_str() << " does not have Xiph Comments";
        return {500, "The file does not have Xiph Comments"};
    }

    auto *tag = file.xiphComment();
    tag->removeFields(denormFieldType, TagLib::String{tagStruct.value, TagLib::String::UTF8});
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.fieldType << " field was removed!";
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << path.c_str() << " saved!";
    return {200, "OK"};
}

crow::response flacTagHandler::addMusicTag(const program::TagModification &tagStruct) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, format::FLAC);
    scopeTimer scopeTimer { path.filename().string() };
    TagLib::FLAC::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << path.c_str() << " is not valid";
        return {500, "The file is not valid"};
    }
    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << path.c_str() << " does not have Xiph Comments";
        return {500, "The file does not have Xiph Comments"};
    }

    auto *tag = file.xiphComment();
    tag->addField(tagStruct.fieldType, TagLib::String{tagStruct.value, TagLib::String::UTF8}, false);
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << path.c_str() << " saved!";
    return {200, "File/s saved!"};
}

crow::response flacTagHandler::editMusicTags(const program::TagModification &tagStruct) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, format::FLAC);
    TagLib::FLAC::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".single) " << path.c_str() << " is not valid";
        return { 500, "The file is not valid" };
    }
    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".single) " << path.c_str() << " does not have Xiph Comments";
        return { 500, "The file does not have Xiph Comments"};
    }

    auto *tag = file.xiphComment();
    tag->addField(denormFieldType, TagLib::String{tagStruct.replaceWith, TagLib::String::UTF8});
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".single) " << path.c_str() << " saved!";
    return { 200, "OK" };
}

crow::response flacTagHandler::editMusicTags(const program::TagModification &tagStruct, bool isBulk) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, format::FLAC);
    TagLib::FLAC::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << path.c_str() << " is not valid";
        return { 500, "The file is not valid" };
    }
    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << path.c_str() << " does not have Xiph Comments";
        return { 500, "The file does not have Xiph Comments"};
    }
    auto *tag = file.xiphComment();
    const auto filedType_it = tag->fieldListMap().find(denormFieldType);
    TagLib::StringList oldValues {}; // Here we store old tagStruct.values of a music file
    TagLib::StringList newValues {}; // Here we will store new tagStruct.values for a music files

    // Check whether tagStruct.fieldType was found
    // If yes, fill oldValues with tagStruct.values
    if (filedType_it != tag->fieldListMap().end()) {
        oldValues = filedType_it->second;
    } else {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType.c_str() << " was not found in " << path.c_str();
        // return { path, tagStruct.fieldType + " was not found" , 500 };
        return { 500, "Field type does not exist" };
    }

    // Here we're edit tagStruct.values
    for (auto &a : oldValues) {
        if (a == TagLib::String{tagStruct.replaceWhat, TagLib::String::UTF8}) { // If we find tagStruct.replaceWhat then we will fill tagStruct.replaceWith instead to newValues
            newValues.append(TagLib::String{tagStruct.replaceWith,TagLib::String::UTF8});
        } else { // Otherwise we fill with oldValue
            newValues.append(a);
        }
    }

    // After that we need to clear the field to fill it with new edited tagStruct.values
    tag->removeFields(tagStruct.fieldType);
    for (const auto &a : newValues) {
        tag->addField(tagStruct.fieldType, a.toCString(), false);
        CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType << " of " << path.c_str() << " has changed to " << a.toCString();
    }
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << path.c_str() << " saved!\n";

    return { 200, "OK" };
}
