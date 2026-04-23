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

    namespace prefix {
        constexpr std::string_view mp3 { "TXXX:" };
        constexpr std::string_view m4a { "----:com.apple.iTunes:" };
    }

    namespace tag {
        // This is Tag Field Mapping. I took it from mp3tag: https://docs.mp3tag.de/mapping-table/
        using TagField = std::string_view;

        constexpr TagField acousticID                       { "ACOUSTID_ID" };
        constexpr TagField acousticIDfingerprint            { "ACOUSTID_FINGERPRINT" };
        constexpr TagField album                            { "ALBUM" };
        constexpr TagField albumSort                        { "ALBUMSORT" };
        constexpr TagField albumArtist                      { "ALBUMARTIST" };
        constexpr TagField albumArtistSort                  { "ALBUMARTISTSORT" };
        constexpr TagField artist                           { "ARTIST" };
        constexpr TagField artistSort                       { "ARTISTSORT" };
        constexpr TagField barcode                          { "BARCODE" };
        constexpr TagField bpm                              { "BPM" };
        constexpr TagField catalogNumber                    { "CATALOGNUMBER" };
        constexpr TagField comment                          { "COMMENT" };
        constexpr TagField compilation                      { "COMPILATION" };
        constexpr TagField composer                         { "COMPOSER" };
        constexpr TagField composerSort                     { "COMPOSERSORT" };
        constexpr TagField conductor                        { "CONDUCTOR" };
        constexpr TagField contentGroup                     { "CONTENTGROUP" };
        constexpr TagField copyright                        { "COPYRIGHT" };
        constexpr TagField date                             { "DATE" };
        constexpr TagField description                      { "DESCRIPTION" };
        constexpr TagField discNumber                       { "DISCNUMBER" };
        constexpr TagField encodedby                        { "ENCODEDBY" };
        constexpr TagField encoderSettings                  { "ENCODERSETTINGS" };
        constexpr TagField encodingTime                     { "ENCODINGTIME" };
        constexpr TagField fileowner                        { "FILEOWNER" };
        constexpr TagField filetype                         { "FILETYPE" };
        constexpr TagField genre                            { "GENRE" };
        constexpr TagField grouping                         { "GROUPING" };
        constexpr TagField initialKey                       { "INITIALKEY" };
        constexpr TagField involvedPeople                   { "INVOLVEDPEOPLE" };
        constexpr TagField isrc                             { "ISRC" };
        constexpr TagField language                         { "LANGUAGE" };
        constexpr TagField length                           { "LENGTH" };
        constexpr TagField lyricist                         { "LYRICIST" };
        constexpr TagField mediatype                        { "MEDIATYPE" };
        constexpr TagField mixartist                        { "MIXARTIST" };
        constexpr TagField mood                             { "MOOD" };
        constexpr TagField movementName                     { "MOVEMENTNAME" };
        constexpr TagField movement                         { "MOVEMENT" };
        constexpr TagField movementTotal                    { "MOVEMENTTOTAL" };

        // mb stands for music brainz
        constexpr TagField mb_albumArtistID                 { "MUSICBRAINZ_ALBUMARTISTID"};
        constexpr TagField mb_albumID                       { "MUSICBRAINZ_ALBUMID" };
        constexpr TagField mb_albumReleaseCountry           { "MUSICBRAINZ_ALBUMRELEASECOUNTRY" };
        constexpr TagField mb_albumStatus                   { "MUSICBRAINZ_ALBUMSTATUS" };
        constexpr TagField mb_albumtype                     { "MUSICBRAINZ_ALBUMTYPE" };
        constexpr TagField mb_artistID                      { "MUSICBRAINZ_ARTISTID" };
        constexpr TagField mb_discID                        { "MUSICBRAINZ_DISCID" };
        constexpr TagField mb_originalAlbumID               { "MUSICBRAINZ_ORIGALBUMID" };
        constexpr TagField mb_originalArtistID              { "MUSICBRAINZ_ORIGINALARTISTID" };
        constexpr TagField mb_releaseGroupID                { "MUSICBRAINZ_RELEASEGROUPID" };
        constexpr TagField mb_releaseTrackID                { "MUSICBRAINZ_RELEASETRACKID" };
        constexpr TagField mb_trackID                       { "MUSICBRAINZ_TRACKID" };
        constexpr TagField mb_trmID                         { "MUSICBRAINZ_TRMID" };
        constexpr TagField mb_workID                        { "MUSICBRAINZ_WORKID" };

        constexpr TagField musicianCredits                  { "MUSICIANCREDITS" };
        constexpr TagField narrator                         { "NARRATOR" };
        constexpr TagField netRadioOwner                    { "NETRADIOOWNER" };
        constexpr TagField netRadioStation                  { "NETRADIOSTATION" };
        constexpr TagField origalbum                        { "ORIGALBUM" };
        constexpr TagField origartist                       { "ORIGARTIST" };
        constexpr TagField origfilename                     { "ORIGFILENAME" };
        constexpr TagField origlyricist                     { "ORIGLYRICIST" };
        constexpr TagField origyear                         { "ORIGYEAR" };
        constexpr TagField podcast                          { "PODCAST" };
        constexpr TagField podcastCategory                  { "PODCATEGORY" };
        constexpr TagField podcastDesc                      { "PODCASTDESC" };
        constexpr TagField podcastID                        { "PODCASTID" };
        constexpr TagField podcastKeywords                  { "PODCASTKEYWORDS" };
        constexpr TagField podcasturl                       { "PODCASTURL" };
        constexpr TagField popularimeter                    { "POPULARIMETER" };
        constexpr TagField publisher                        { "PUBLISHER" };
        constexpr TagField rating_mm                        { "RATING MM" };
        constexpr TagField rating_wmp                       { "RATING WMP" };
        constexpr TagField releasetime                      { "RELEASETIME" };
        constexpr TagField setsubtitle                      { "SETSUBTITLE" };
        constexpr TagField subtitle                         { "SUBTITLE" };
        constexpr TagField taggingtime                      { "TAGGINGTIME" };
        constexpr TagField title                            { "TITLE" };
        constexpr TagField titleSort                        { "TITLESORT" };
        constexpr TagField track                            { "TRACK" };
        constexpr TagField uniqueFieldID                    { "UNIQUEFIELDID" };
        constexpr TagField unsyncedLyrics                   { "UNSYNCEDLYRICS" };
        constexpr TagField year                             { "YEAR" };

        constexpr TagField coverArt                         { "COVERART" };

        struct tagRegistry {
            std::unordered_map<std::string, std::string> rawToNormalized;

            std::unordered_map<format, std::unordered_map<std::string, std::string>> normalizedToRaw;
        };

        const tagRegistry &getTagRegistry();
        const json &getJsonTagRegistry();
        std::string normalize(const std::string &rawTag);
        std::string normalize(const std::string &rawTag, format format);
        std::string denormalize(const std::string &normalizedTag, format format);
    }

    enum class format {
        ID3v23, ID3v24,
        FLAC, M4A, OGG,
        OPUS, AAC, WMA,
        WAV, AIF, AIFF,
        ALAC,

    };
}
#endif //WEB_TAG_EDITOR_MUSIC_H