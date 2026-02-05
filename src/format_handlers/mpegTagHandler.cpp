//
// Created by myooker on 1/24/26.
//

#include "../../include/format_handlers/mpegTagHandler.h"

#include <mpegfile.h>
#include <textidentificationframe.h>
#include <id3v2tag.h>
#include <id3v1tag.h>

using namespace audioFormat;

std::string mpegTagHandler::IDv3TagToString(const TagLib::ByteVector &frameID) {
    const std::string temp { frameID.data() };
    const std::unordered_map<std::string, std::string> tagMap = {
        {"TALB", "ALBUM"},
        {"TCON", "GENRE"},
        {"TDOR", "ORIGYEAR"},
        {"TDRC", "YEAR"},
        {"TIT2", "TITLE"},
        {"TLEN", "LENGTH"},
        {"TMED", "MEDIATYPE"},
        {"TPE1", "ARTIST"},
        {"TPE2", "ALBUMARTIST"},
        {"TPOS", "DISCNUMBER"},
        {"TPUB", "PUBLISHER"},
        {"TRCK", "TRACK"},
        {"TSO2", "ALBUMARTISTSORT"},
        {"TSOP", "ARTISTSORT"},
        {"TSRC", "ISRC"},
        {"TXXX", "USERDEF"}
    };

    if (auto it = tagMap.find(temp); it != tagMap.end()) {
        return it->second;
    } else {
        return "UNKNTAG";
    }
}

TagLib::ByteVector mpegTagHandler::StringToIDv3Tag(const std::string &frameID) {
    TagLib::ByteVector frame{};

    const std::unordered_map<std::string, std::string> tagMap = {
        {"ALBUM", "TALB"},
        {"GENRE", "TCON"},
        {"ORIGYEAR", "TDOR"},
        {"YEAR", "TDRC"},
        {"TITLE", "TIT2"},
        {"LENGTH", "TLEN"},
        {"MEDIATYPE", "TMED"},
        {"ARTIST", "TPE1"},
        {"ALBUMARTIST", "TPE2"},
        {"DISCNUMBER", "TPOS"},
        {"PUBLISHER", "TPUB"},
        {"TRACK", "TRCK"},
        {"ALBUMARTISTSORT", "TSO2"},
        {"ARTISTSORT", "TSOP"},
        {"ISRC", "TSRC"},
        {"USERDEF", "TXXX"}
    };

    if (const auto it = tagMap.find(frameID); it != tagMap.end()) {
        return TagLib::ByteVector { it->second.c_str() };
    } else {
        return TagLib::ByteVector { "TXXX" };
    }
}

std::expected<json, std::string> mpegTagHandler::listMusicTags(const std::string &filePath) {
    TagLib::MPEG::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected("The file is not valid");
    }

    if (!file.hasID3v2Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have ID3v2Tag";
        return std::unexpected("The file does not have ID3v2Tag");
    }

    json base = json::object();
    json userdef = json::object();
    const auto tag = file.ID3v2Tag();

    // .ID3v2Tag() will return a nullptr if there are no such tags
    // Here we handle it
    if (!tag) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have ID3v2Tag";
        return std::unexpected("The file does not have ID3v2Tag");
    }

    const auto map = tag->frameListMap();
    for (const auto &pair : map) {
        const auto frameID = pair.first;
        const auto frameList = pair.second;
        for (auto *frame : frameList) {
            const auto *user = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame);
            if (user) {
                const auto &fields = user->fieldList();
                if (fields.size() >= 2) {
                    const std::string key = fields[0].to8Bit(true);
                    std::string value = fields[1].to8Bit(true);
                    userdef[key] = value;
                }
                continue;
            }
            const auto *textFrame = dynamic_cast<TagLib::ID3v2::TextIdentificationFrame*>(frame);
            if (textFrame) {
                const auto list = textFrame->fieldList();
                const std::string frameKey { IDv3TagToString(frameID) };
                // If there's only one frame, just assign it to the id
                // Otherwise make an array of frames of frameID name
                if (list.size() == 1) {
                    base[frameKey] = list.toString().to8Bit(true);
                } else if (list.size() > 1) {
                    base[frameKey] = json::array();
                    for (const auto &a : list) {
                        base[IDv3TagToString(frameID)] += a.to8Bit(true);
                    }
                }
            }
        }
    }
    for (const auto &a : userdef.items()) {
        base[a.key()] = a.value();
    }
    return base;
}

void mpegTagHandler::removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc) {
    TagLib::ID3v2::FrameList frames = tag->frameList("TXXX");

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " TXXX frames size: " << frames.size();

    for (auto *frame : frames) {
        if (const auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
            const std::string frameDesc = userFrame->description().toCString(true);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame description: " << frameDesc;
            if (frameDesc == desc) {
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame (" << frameDesc << ") is removed";
                tag->removeFrame(frame);
                return;
            }
        }
    }
}

crow::response mpegTagHandler::removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    const fs::path path { filePath };
    TagLib::MPEG::File file { path.c_str() };
    if (!file.isValid()) {
        return crow::response {500, "Object is not valid"};
    }

    if (!file.hasID3v2Tag()) {
        return crow::response {500, "Object does not have an ID3v2Tag"};
    }

    auto *tag = file.ID3v2Tag();
    auto frameID = StringToIDv3Tag(fieldType);
    const std::string frameIDstr { frameID.data(), frameID.size() };
    auto frames = tag->frameList(frameID);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " fieldtype is " << fieldType;
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " fildtype to idv3tag " << StringToIDv3Tag(fieldType);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frames are " << frames.size() << " frames";

    if (frameIDstr == "TXXX") {
        removeTXXXFrame(tag, fieldType);
        file.save();
    } else if (!frames.isEmpty()) {
        auto *frame = frames.front();
        tag->removeFrame(frame);
        file.strip(TagLib::MPEG::File::ID3v1);
        file.save();
    }

    return crow::response {200, "OK" };
}

void mpegTagHandler::addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const std::string &text) {
    TagLib::ID3v2::FrameList frames = tag->frameList("TXXX");

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " TXXX frames size: " << frames.size();

    for (auto *frame : frames) {
        if (const auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
            const std::string frameDesc = userFrame->description().toCString(true);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame description: " << frameDesc;
            if (frameDesc == desc) {
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " found conflicting " << desc;
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " removing " << desc;
                tag->removeFrame(frame);
                break;
            }
        }
    }

    auto *newFrame = new TagLib::ID3v2::UserTextIdentificationFrame(TagLib::String::UTF8);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame desc: " << desc;
    newFrame->setDescription(desc);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame text: " << text;
    newFrame->setText(text);
    tag->addFrame(newFrame);
}

crow::response mpegTagHandler::addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
    const fs::path path { filePath };
    TagLib::MPEG::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << path;
        return crow::response {500, "File is not valid"};
    }
    if (!file.hasID3v2Tag()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file does not have an ID3v2Tag: " << path;
        return crow::response {500, "File does not have an ID3v2Tag"};
    }

    auto *tag = file.ID3v2Tag();
    auto frameID = StringToIDv3Tag(fieldType);
    auto frames = tag->frameList(frameID);
    const std::string frameIDstr { frameID.data(), frameID.size() };
    TagLib::ID3v2::Frame *newFrame = new TagLib::ID3v2::TextIdentificationFrame(frameID);
    newFrame->setText(value);

    if (frameIDstr == "TXXX") {
        addTXXXFrame(tag, fieldType, value);
        file.save();
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
        return crow::response {200, "OK" };
    }

    if (frames.isEmpty()) {
        CROW_LOG_DEBUG << "(" << __func__ << ") Adding new frame to the file...";
        tag->addFrame(newFrame);
        file.save();
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
    } else {
        CROW_LOG_DEBUG << "(" << __func__ << ") Frame " << frameID << " already exists in the file: " << path;
        CROW_LOG_DEBUG << "(" << __func__ << ") Skipping...";
    }

    return crow::response {200, "OK" };
}

crow::response mpegTagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) {
    const fs::path path { filePath };
    TagLib::MPEG::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << path;
        return crow::response {500, "File is not valid"};
    }
    if (!file.hasID3v2Tag()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file does not have an ID3v2Tag: " << path;
        return crow::response {500, "File does not have an ID3v2Tag"};
    }

    auto *tag = file.ID3v2Tag();
    auto frameID = StringToIDv3Tag(fieldType);
    auto frames = tag->frameList(frameID);
    const std::string frameIDstr { frameID.data(), frameID.size() };
    TagLib::ID3v2::Frame *newFrame = new TagLib::ID3v2::TextIdentificationFrame(frameID);

    if (frameIDstr == "TXXX") {
        addTXXXFrame(tag, fieldType, replaceWith);
        file.save();
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
        return crow::response {200, "OK" };
    }

    newFrame->setText(replaceWith);
    CROW_LOG_DEBUG << "(" << __func__ << ") Removing existing frame...";
    tag->removeFrames(frameID);
    CROW_LOG_DEBUG << "(" << __func__ << ") Adding new frame...";
    tag->addFrame(newFrame);
    file.save();
    CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";

    return crow::response {200, "OK" };
}
