//
// Created by myooker on 3/1/26.
//

#include "../include/music.h"
#include <crow/logging.h>
#include <unordered_set>

namespace program::music::tag {
    using json = nlohmann::json;

    const tagRegistry &getTagRegistry() {
        static tagRegistry s_registry = [] {
            tagRegistry temp;

            auto reg = [&](const music::format format, const std::string_view normalized, const std::string_view raw) {
                temp.rawToNormalized[std::string(raw)] = normalized;
                temp.normalizedToRaw[format][std::string(normalized)] = raw;
            };

            // -----------------------------------------------------
            //  Title
            // -----------------------------------------------------
            reg(format::MP3, tag::title,        "TIT2");
            reg(format::M4A, tag::title,        "©nam");
            reg(format::FLAC, tag::title,       "TITLE");

            // -----------------------------------------------------
            //  Artist
            // -----------------------------------------------------
            reg(format::MP3, tag::artist,       "TPE1");
            reg(format::M4A, tag::artist,       "©ART");
            reg(format::FLAC, tag::artist,      "ARTIST");

            // -----------------------------------------------------
            //  Artist Sort
            // -----------------------------------------------------
            reg(format::MP3, tag::artistSort,   "TSOP");

            // -----------------------------------------------------
            //  Album
            // -----------------------------------------------------
            reg(format::MP3, tag::album,        "TALB");
            reg(format::M4A, tag::album,        "©alb");
            reg(format::FLAC, tag::album,       "ALBUM");

            // -----------------------------------------------------
            //  Album Artist
            // -----------------------------------------------------
            reg(format::MP3, tag::albumArtist,  "TPE2");
            reg(format::M4A, tag::albumArtist,  "aART");
            reg(format::FLAC, tag::albumArtist, "ALBUMARTIST");

            // -----------------------------------------------------
            // Album Artist Sort
            // -----------------------------------------------------
            reg(format::MP3, tag::albumArtistSort,"TSO2");

            // -----------------------------------------------------
            //  Track Number (x of y)
            // -----------------------------------------------------
            reg(format::MP3, tag::trackNumber,   "TRCK");
            reg(format::M4A, tag::trackNumber,   "trkn");
            reg(format::FLAC, tag::trackNumber,  "TRACKNUMBER");

            // -----------------------------------------------------
            //  Total Tracks (y)
            // -----------------------------------------------------
            reg(format::MP3, tag::totalTracks,   "TRCK");
            reg(format::M4A, tag::totalTracks,   "trkn");
            reg(format::FLAC, tag::totalTracks,  "TRACKTOTAL");

            // -----------------------------------------------------
            //  Disc Number (x of y)
            // -----------------------------------------------------
            reg(format::MP3, tag::discNumber,    "TPOS");
            reg(format::M4A, tag::discNumber,    "disk");
            reg(format::FLAC, tag::discNumber,   "DISCNUMBER");

            // -----------------------------------------------------
            //  Total Discs (y)
            // -----------------------------------------------------
            reg(format::MP3, tag::totalDiscs,    "TPOS");
            reg(format::M4A, tag::totalDiscs,    "disk");
            reg(format::FLAC, tag::totalDiscs,   "DISCTOTAL");

            // -----------------------------------------------------
            //  Year
            // -----------------------------------------------------
            reg(format::MP3, tag::year,          "TYER");   // ID3v2.3 (fallback)
            reg(format::MP3, tag::year,          "TDRC");   // ID3v2.4
            reg(format::M4A, tag::year,          "©day");
            reg(format::FLAC, tag::year,         "DATE");

            // -----------------------------------------------------
            //  Original release time (ORIGYEAR) - ID3v2.4
            // -----------------------------------------------------
            reg(format::MP3, tag::origyear,      "TDOR");

            // -----------------------------------------------------
            // Media Type - ID3v2.4
            // -----------------------------------------------------
            reg(format::MP3, tag::mediatype,     "TMED");

            // -----------------------------------------------------
            //  Genre
            // -----------------------------------------------------
            reg(format::MP3, tag::genre,         "TCON");
            reg(format::M4A, tag::genre,         "©gen");
            reg(format::FLAC, tag::genre,        "GENRE");

            // -----------------------------------------------------
            //  Composer
            // -----------------------------------------------------
            reg(format::MP3, tag::composer,      "TCOM");
            reg(format::M4A, tag::composer,      "©wrt");
            reg(format::FLAC, tag::composer,     "COMPOSER");

            // -----------------------------------------------------
            //  Conductor
            // -----------------------------------------------------
            reg(format::MP3, tag::conductor,     "TPE3");
            reg(format::M4A, tag::conductor,     "----:com.apple.iTunes:CONDUCTOR");
            reg(format::FLAC, tag::conductor,    "CONDUCTOR");

            // -----------------------------------------------------
            //  Lyricist
            // -----------------------------------------------------
            reg(format::MP3, tag::lyricist,      "TEXT");
            reg(format::M4A, tag::lyricist,      "©lyr");
            reg(format::FLAC, tag::lyricist,     "LYRICIST");

            // -----------------------------------------------------
            //  Lyrics
            // -----------------------------------------------------
            reg(format::MP3, tag::lyrics,        "USLT");
            reg(format::M4A, tag::lyrics,        "©lyr");
            reg(format::FLAC, tag::lyrics,       "LYRICS");

            // -----------------------------------------------------
            //  Comment
            // -----------------------------------------------------
            reg(format::MP3, tag::comment,       "COMM");
            reg(format::M4A, tag::comment,       "©cmt");
            reg(format::FLAC, tag::comment,      "COMMENT");

            // -----------------------------------------------------
            //  BPM (beats per minute)
            // -----------------------------------------------------
            reg(format::MP3, tag::bpm,           "TBPM");
            reg(format::M4A, tag::bpm,           "tmpo");
            reg(format::FLAC, tag::bpm,          "BPM");

            // -----------------------------------------------------
            //  Length (duration in seconds)
            // -----------------------------------------------------
            reg(format::MP3, tag::length,        "TLEN");
            reg(format::M4A, tag::length,        "©dur");
            reg(format::FLAC, tag::length,       "TOTALTIME");

            // -----------------------------------------------------
            //  Compilation
            // -----------------------------------------------------
            reg(format::MP3, tag::compilation,   "TCMP");
            reg(format::M4A, tag::compilation,   "cpil");
            reg(format::FLAC, tag::compilation,  "COMPILATION");

            // -----------------------------------------------------
            //  Publisher / Label
            // -----------------------------------------------------
            reg(format::MP3, tag::publisherLabel,"TPUB");
            reg(format::M4A, tag::publisherLabel,"©pub");
            reg(format::FLAC, tag::publisherLabel,"PUBLISHER");

            // -----------------------------------------------------
            //  ISRC
            // -----------------------------------------------------
            reg(format::MP3, tag::isrc,          "TSRC");
            reg(format::M4A, tag::isrc,          "----:com.apple.iTunes:ISRC");
            reg(format::FLAC, tag::isrc,         "ISRC");

            // -----------------------------------------------------
            //  Encoder
            // -----------------------------------------------------
            reg(format::MP3, tag::encoder,       "TENC");
            reg(format::M4A, tag::encoder,       "©too");
            reg(format::FLAC, tag::encoder,      "ENCODER");

            // -----------------------------------------------------
            //  Copyright
            // -----------------------------------------------------
            reg(format::MP3, tag::copyright,     "TCOP");
            reg(format::M4A, tag::copyright,     "cprt");
            reg(format::FLAC, tag::copyright,    "COPYRIGHT");

            // -----------------------------------------------------
            //  Cover Art (image data)
            // -----------------------------------------------------
            reg(format::MP3, tag::coverArt,      "APIC");
            reg(format::M4A, tag::coverArt,      "covr");
            reg(format::FLAC, tag::coverArt,     "METADATA_BLOCK_PICTURE");

            return temp;
        }();

        return s_registry;
    }

    const json &getJsonTagRegistry() {
        static json j = json::array();
        std::unordered_set<std::string> s;
        const auto &reg = getTagRegistry();

        for (const auto &entity : reg.rawToNormalized) {
            s.insert(entity.second);
        }

        for (const auto &entity : s) {
            j.push_back(entity);
        }

        return j;
    }

    std::string normalize(const std::string &rawTag) {
        const auto &reg = getTagRegistry();
        const std::string prefix { "----:com.apple.iTunes:" };
        auto it = reg.rawToNormalized.find(rawTag);

        if (rawTag.starts_with(prefix)) {
            std::string normalized { rawTag };
            normalized = normalized.substr(prefix.size());
            return normalized;
        }

        return it != reg.rawToNormalized.end() ? it->second : rawTag;
    }

    std::string denormalize(const std::string &normalizedTag, format format) {
        const auto &reg = getTagRegistry();

        auto it = reg.normalizedToRaw.find(format);

        if (it != reg.normalizedToRaw.end()) {
            auto tagIt = it->second.find(normalizedTag);

            if (tagIt != it->second.end()) {
                return tagIt->second;
            }
        }
        return normalizedTag;
    }
}