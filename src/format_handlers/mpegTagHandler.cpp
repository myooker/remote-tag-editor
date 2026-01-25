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

json mpegTagHandler::listMusicTags(const std::string &filePath) {
    TagLib::MPEG::File file { filePath.c_str() };

    if (!file.isValid()) {
        return json::object({
            {"error", true },
            {"message", "Invalid file"},
            {"code", 500}
        });
    }

    json base = json::object();
    json userdef = json::object();
    const auto tag = file.ID3v2Tag();

    // .ID3v2Tag() will return a nullptr if there are no such tags
    // Here we handle it
    if (!tag) {
        return json::object({
            {"error", true},
            {"message", "No ID3v2Tag in the file"},
            {"code", 500}
        });
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
        auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame);
        if (userFrame) {
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

crow::response mpegTagHandler::removeMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) {
    for (const auto &path : filePaths) {
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
    }

    return crow::response {200, "OK" };
}

crow::response mpegTagHandler::addMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) {
    return crow::response {500};
}

crow::response mpegTagHandler::editMusicTags(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &replaceWith) {
    return crow::response {500};
}
