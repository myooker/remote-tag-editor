//
// Created by myooker on 2/10/26.
//

#include "oggVorbisTagHandler.h"
#include <vorbisfile.h>
#include "../../include/music.h"

using namespace audioFormat;

std::expected<json, std::string> oggVorbisTagHandler::listMusicTags(const std::string &filePath) {
    TagLib::Vorbis::File file{filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected(filePath + " is not valid");
    }

    json j;
    const auto tag = file.tag();
    for (const auto &a: tag->fieldListMap()) {
        const std::string key = a.first.to8Bit(true);
        if (a.second.size() > 1) {
            const std::size_t temp{a.second.size()};
            for (std::size_t i{0}; i < temp; ++i) {
                std::string value{a.second[i].to8Bit(true)};
                j[key] += value;
            }
            continue;
        }
        std::string value{a.second[0].to8Bit(true)};
        j[key] = value;
    }
    CROW_LOG_DEBUG << "(" << __func__ << ") returning JSON";
    return j;
}

crow::response oggVorbisTagHandler::removeMusicTag(const program::TagModification &tagStruct) {
    TagLib::Ogg::Vorbis::File file{tagStruct.filePath.c_str()};
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath.c_str() << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    tag->removeFields(tagStruct.fieldType, TagLib::String{tagStruct.value, TagLib::String::UTF8});
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.fieldType << " field was removed!";
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.filePath.c_str() << " saved!";
    return {200, "OK"};
}

crow::response oggVorbisTagHandler::addMusicTag(const program::TagModification &tagStruct) {
    TagLib::Ogg::Vorbis::File file{tagStruct.filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    tag->addField(tagStruct.fieldType, TagLib::String{tagStruct.value, TagLib::String::UTF8}, false);
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.filePath << " saved!";
    return {200, "File/s saved!"};
}

crow::response oggVorbisTagHandler::editMusicTags(const program::TagModification &tagStruct) {
    using namespace program::music;
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, format::FLAC);
    TagLib::Ogg::Vorbis::File file{tagStruct.filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << tagStruct.filePath << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    const auto filedType_it = tag->fieldListMap().find(tagStruct.fieldType);
    TagLib::StringList oldValues{}; // Here we store old values of a music file
    TagLib::StringList newValues{}; // Here we will store new values for a music files

    // Check whether tagStruct.tagType was found
    // If yes, fill StringList oldValues with tagStruct.values
    if (filedType_it != tag->fieldListMap().end()) {
        oldValues = filedType_it->second; // Get an array of old values inside music file
    } else {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType.c_str() << " was not found in " << tagStruct.filePath;
        return { 500, "Field type does not exist" };
    }

    // Here we're editing tagStruct.values
    for (auto &a : oldValues) {
        if (a == TagLib::String{tagStruct.replaceWhat, TagLib::String::UTF8}) { // If we find tagStruct.replaceWhat then we will fill tagStruct.replaceWith instead to newValues
            newValues.append(TagLib::String{tagStruct.replaceWith,TagLib::String::UTF8});
        } else { // Otherwise we fill with oldValue
            newValues.append(a);
        }
    }

    // After that we need to clear the field to fill it with new edited tagStruct.values
    tag->removeFields(tagStruct.fieldType);
    // After filling up StringList newValues, we need to clear current tags inside a file
    // Then we write newValues to requested tag field (tagStruct.tagType) without replacing.
    tag->removeFields(denormFieldType);
    for (const auto &a : newValues) {
        tag->addField(tagStruct.fieldType, TagLib::String{a.toCString(true), TagLib::String::UTF8}, false);
        CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType << " of " << tagStruct.filePath << " has changed to " << a.toCString();
    }
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.filePath << " saved!\n";

    return { 200, "OK" };
}

std::expected<std::string, bool> oggVorbisTagHandler::hasRTEID(const std::string &filePath) {
    using namespace program::music::tag;
    TagLib::Ogg::Vorbis::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath.c_str() << " is not valid";
        return std::unexpected(false);
    }

    auto t = file.tag()->fieldListMap().find(std::string(rteID));
    if (t != file.tag()->fieldListMap().end()) {
        return t->second.operator[](0).toCString();
    }
    return std::unexpected(false);
}
