//
// Created by myooker on 2/10/26.
//

#include "oggFlacTagHandler.h"
#include "../../include/music.h"

#include <oggflacfile.h>

using namespace audioFormat;

void oggFlacTagHandler::ensureRteid(std::string* rteid, TagLib::Ogg::XiphComment* tag) {
    using namespace TagLib;
    const auto it = tag->fieldListMap().find(std::string(tag::rteID));
    if (it != tag->fieldListMap().end()) *rteid = it->second[0].toCString(false);
    else tag->addField(std::string(tag::rteID), String{*rteid, String::UTF8}, true);
}

std::expected<json, std::string> oggFlacTagHandler::listMusicTags(const std::string &filePath) {
    TagLib::Ogg::FLAC::File file{filePath.c_str()};

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

crow::response oggFlacTagHandler::removeMusicTag(const program::TagModification &tagStruct, std::string *rteid) {
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath.c_str() << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    if (tagStruct.value.empty())
        tag->removeFields(tagStruct.fieldType);
    else
        tag->removeFields(tagStruct.fieldType, TagLib::String{tagStruct.value, TagLib::String::UTF8});
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.fieldType << " field was removed!";
    if (rteid) ensureRteid(rteid, tag);
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.filePath.c_str() << " saved!";
    return {200, "OK"};
}

crow::response oggFlacTagHandler::addMusicTag(const program::TagModification &tagStruct, std::string *rteid) {
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << tagStruct.filePath << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    tag->addField(tagStruct.fieldType, TagLib::String{tagStruct.value, TagLib::String::UTF8}, false);
    if (rteid) ensureRteid(rteid, tag);
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << tagStruct.filePath << " saved!";
    return {200, "File/s saved!"};
}

crow::response oggFlacTagHandler::editMusicTags(const program::TagModification &tagStruct, std::string *rteid) {
    using namespace program::music;
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, format::FLAC);
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

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
        if (a.toCString(true) == tagStruct.replaceWhat) { // If we find tagStruct.replaceWhat then we will fill tagStruct.replaceWith instead to newValues
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
        tag->addField(tagStruct.fieldType, a, false);
        CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType << " of " << tagStruct.filePath << " has changed to " << a.toCString();
    }
    if (rteid) ensureRteid(rteid, tag);
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.filePath << " saved!\n";

    return { 200, "OK" };
}