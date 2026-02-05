//
// Created by myooker on 1/24/26.
//

#include "../../include/format_handlers/flacTagHandler.h"
#include "../../include/scopeTimer.h"
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
        if (a.second.size() > 1) {
            const std::size_t temp { a.second.size() };
            for (std::size_t i { 0 }; i < temp; ++i) {
                std::string value { a.second[i].to8Bit(true) };
                j[key] += value;
            }
            continue;
        }
        std::string value { a.second[0].to8Bit(true) };
        j[key] = value;
    }
    CROW_LOG_DEBUG << "(" << __func__ << ") returning JSON";
    return j;
}

crow::response flacTagHandler::removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    const fs::path path { filePath };
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
    tag->removeFields(fieldType, value);
    CROW_LOG_INFO << "(" << __func__ << ") " << fieldType << " field was removed!";
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << path.c_str() << " saved!";
    return {200, "OK"};
}

crow::response flacTagHandler::addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    const fs::path path { filePath };
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
    tag->addField(fieldType, value, false);
    file.save();
    CROW_LOG_INFO << "(" << __func__ << ") " << path.c_str() << " saved!";
    return {200, "File/s saved!"};
}

crow::response flacTagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) {
    const fs::path path { filePath };
    TagLib::FLAC::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".single) " << path.c_str() << " is not valid";
        // return { path, "The file is not valid", 500 };
        return { 500, "The file is not valid" };
    }
    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".single) " << path.c_str() << " does not have Xiph Comments";
        // return { path, "The file does not have Xiph Comments", 500 };
        return { 500, "The file does not have Xiph Comments"};
    }

    auto *tag = file.xiphComment();
    tag->addField(fieldType, replaceWith);
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".single) " << path.c_str() << " saved!";
    return { 200, "OK" };
}

crow::response flacTagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith) {
    const fs::path path { filePath };
    TagLib::FLAC::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << path.c_str() << " is not valid";
        // return { path, "The file is not valid", 500 };
        return { 500, "The file is not valid" };
    }
    if (!file.hasXiphComment()) {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << path.c_str() << " does not have Xiph Comments";
        // return { path, "The file does not have Xiph Comments", 500 };
        return { 500, "The file does not have Xiph Comments"};
    }
    auto *tag = file.xiphComment();
    const auto filedType_it = tag->fieldListMap().find(fieldType);
    TagLib::StringList oldValues {}; // Here we store old values of a music file
    TagLib::StringList newValues {}; // Here we will store new values for a music files

    // Check whether fieldType was found
    // If yes, fill oldValues with values
    if (filedType_it != tag->fieldListMap().end()) {
        oldValues = filedType_it->second;
    } else {
        CROW_LOG_ERROR << "(FLAC::" << __func__ << ".multi) " << fieldType.c_str() << " was not found in " << path.c_str();
        // return { path, fieldType + " was not found" , 500 };
        return { 500, "Field type does not exist" };
    }

    // Here we're edit values
    for (auto &a : oldValues) {
        if (a == replaceWhat) { // If we find replaceWhat then we will fill replaceWith instead to newValues
            newValues.append(replaceWith);
        } else { // Otherwise we fill with oldValue
            newValues.append(a);
        }
    }

    // After that we need to clear the field to fill it with new edited values
    tag->removeFields(fieldType);
    for (const auto &a : newValues) {
        tag->addField(fieldType, a.toCString(), false);
        CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << fieldType << " of " << path.c_str() << " has changed to " << a.toCString();
    }
    file.save();
    CROW_LOG_INFO << "(FLAC::" << __func__ << ".multi) " << path.c_str() << " saved!\n";

    return { 200, "OK" };
}
