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
                        std::string key = fields[0].to8Bit();
                        std::string value = fields[1].to8Bit();
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
                        base[frameKey] = list.toString().to8Bit();
                    } else if (list.size() > 1) {
                        base[frameKey] = json::array();
                        for (const auto &a : list) {
                            base[IDv3TagToString(frameID)] += a.to8Bit();
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