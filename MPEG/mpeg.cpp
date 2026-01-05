#include "mpeg.h"

namespace MPEG {
    std::string IDv3TagToString(const TagLib::ByteVector &frameID) {
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

    json listMusicTags(const std::string &path) {
        TagLib::MPEG::File file { path.c_str() };

        json base = json::object();
        json userdef = json::object();
        const auto tag = file.ID3v2Tag();
        const auto map = tag->frameListMap();
        for (const auto &pair : map) {
            const auto frameID = pair.first; //
            const auto frameList = pair.second;
            for (auto *frame : frameList) {
                const auto *user = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame);
                if (user) {
                    const auto &fields = user->fieldList();
                    if (fields.size() >= 2) {
                        std::string key = fields[0].toCString();
                        std::string value = fields[1].toCString();
                        userdef[key] = value;
                    }
                    continue;
                }
                const auto *textFrame = dynamic_cast<TagLib::ID3v2::TextIdentificationFrame*>(frame);
                if (textFrame) {
                    const auto list = textFrame->fieldList();
                    // If there's only one frame, just assign it to the id
                    // Otherwise make an array of frames of frameID name
                    if (list.size() == 1) {
                        base[IDv3TagToString(frameID)] = list.toString().toCString();
                    } else {
                        for (const auto &a : list) {
                            base[IDv3TagToString(frameID)] += a.toCString();
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
}