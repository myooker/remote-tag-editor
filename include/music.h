//
// Created by myooker on 3/2/26.
//

#ifndef WEB_TAG_EDITOR_MUSIC_H
#define WEB_TAG_EDITOR_MUSIC_H

#include <string>
#include <string_view>
#include <unordered_map>

#include <nlohmann/json.hpp>
#include <nlohmann/json_fwd.hpp>

namespace program::music {
    enum class format;
    using json = nlohmann::json;

    namespace tag {
        constexpr std::string_view title { "Title" };
        constexpr std::string_view artist { "Artist" };
        constexpr std::string_view artistSort { "AritstSort" };
        constexpr std::string_view album { "Album" };
        constexpr std::string_view albumArtist { "AlbumArtist" };
        constexpr std::string_view albumArtistSort { "AlbumArtistSort" };
        constexpr std::string_view trackNumber { "Track Number" };
        constexpr std::string_view totalTracks { "Total Tracks" };
        constexpr std::string_view discNumber { "Disc Number" };
        constexpr std::string_view totalDiscs { "Total Discs" };
        constexpr std::string_view year { "Year" };
        constexpr std::string_view origyear { "Original Year" };
        constexpr std::string_view genre { "Genre" };
        constexpr std::string_view composer { "Composer" };
        constexpr std::string_view conductor { "Conductor" };
        constexpr std::string_view lyricist { "Lyricist" };
        constexpr std::string_view lyrics { "Lyrics" };
        constexpr std::string_view comment { "Comment" };
        constexpr std::string_view bpm { "BPM" };
        constexpr std::string_view length { "Length" };
        constexpr std::string_view mediatype { "Mediatype" };
        constexpr std::string_view compilation { "Compilation" };
        constexpr std::string_view publisherLabel { "Label" };
        constexpr std::string_view isrc { "ISRC" };
        constexpr std::string_view encoder { "Encoder" };
        constexpr std::string_view copyright { "Copyright" };
        constexpr std::string_view coverArt { "Cover Art" };

        struct tagRegistry {
            std::unordered_map<std::string, std::string> rawToNormalized;

            std::unordered_map<format, std::unordered_map<std::string, std::string>> normalizedToRaw;
        };

        const tagRegistry &getTagRegistry();
        const json &getJsonTagRegistry();
        std::string normalize(const std::string &rawTag);
        std::string denormalize(const std::string &normalizedTag, format format);
    }

    enum class format {
        MP3, FLAC, M4A,
        OGG, OPUS, AAC,
        WMA, WAV, AIF,
        AIFF, ALAC,
    };
}
#endif //WEB_TAG_EDITOR_MUSIC_H