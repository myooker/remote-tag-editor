//
// Created by myooker on 2/10/26.
//

#include "oggFlacTagHandler.h"

#include <oggflacfile.h>

using namespace audioFormat;

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

crow::response oggFlacTagHandler::removeMusicTag(const program::TagModification &tagStruct) {
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

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

crow::response oggFlacTagHandler::addMusicTag(const program::TagModification &tagStruct) {
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

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

crow::response oggFlacTagHandler::editMusicTags(const program::TagModification &tagStruct) {
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".single) " << tagStruct.filePath << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    tag->addField(tagStruct.fieldType, TagLib::String{tagStruct.replaceWith, TagLib::String::UTF8});
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".single) " << tagStruct.filePath << " saved!";
    return {200, "OK"};
}

crow::response oggFlacTagHandler::editMusicTags(const program::TagModification &tagStruct, bool isBulk) {
    TagLib::Ogg::FLAC::File file{tagStruct.filePath.c_str()};

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << tagStruct.filePath << " is not valid";
        return {500, "The file is not valid"};
    }

    auto *tag = file.tag();
    const auto filedType_it = tag->fieldListMap().find(tagStruct.fieldType);
    TagLib::StringList oldValues{}; // Here we store old values of a music file
    TagLib::StringList newValues{}; // Here we will store new values for a music files

    // Check whether fieldType was found
    // If yes, fill oldValues with values
    if (filedType_it != tag->fieldListMap().end()) {
        oldValues = filedType_it->second;
    } else {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType.c_str() << " was not found in " <<
            tagStruct.filePath;
        // return { path, fieldType + " was not found" , 500 };
        return {500, "Field type does not exist"};
    }

    // Here we're edit values
    for (auto &a: oldValues) {
        if (a == TagLib::String{tagStruct.replaceWhat, TagLib::String::UTF8}) {
            // If we find replaceWhat then we will fill replaceWith instead to newValues
            newValues.append(TagLib::String{tagStruct.replaceWith, TagLib::String::UTF8});
        } else {
            // Otherwise we fill with oldValue
            newValues.append(a);
        }
    }

    // After that we need to clear the field to fill it with new edited values
    tag->removeFields(tagStruct.fieldType);
    for (const auto &a: newValues) {
        tag->addField(tagStruct.fieldType, a.toCString(), false);
        CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.fieldType << " of " << tagStruct.filePath <<
            " has changed to " << a.toCString();
    }
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << tagStruct.filePath << " saved!\n";

    return {200, "OK"};
}
