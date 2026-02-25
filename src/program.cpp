#include "../include/program.h"

#include <boost/bimap.hpp>
#include <boost/bimap/unordered_set_of.hpp>
#include <string>

using namespace boost::bimaps;
using namespace program;

namespace program::music {


    tagMap &getMapTag(const format format) {
        static tagMap mp3 = []{
            tagMap temp;

            temp.insert({typeField::title, "TIT2"});
            temp.insert({typeField::artist, "TPE1"});
            temp.insert({typeField::albumArtist, "TPE2"});
            temp.insert({typeField::album, "TALB"});
            temp.insert({typeField::trackNumber, "TRCK"});
            temp.insert({typeField::totalTracks, "TRCK"});
            temp.insert({typeField::discNumber, "TPOS"});
            temp.insert({typeField::totalDiscs, "TPOS"});
            temp.insert({typeField::year, "TDRC"});
            temp.insert({typeField::genre, "TCON"});
            temp.insert({typeField::composer, "TCOM"});
            temp.insert({typeField::conductor, "TPE3"});
            temp.insert({typeField::lyricist, "TEXT"});
            temp.insert({typeField::lyrics, "USLT"});
            temp.insert({typeField::comment, "COMM"});
            temp.insert({typeField::bpm, "TBPM"});
            temp.insert({typeField::length, "TLEN"});
            temp.insert({typeField::compilation, "TCMP"});
            temp.insert({typeField::publisherLabel, "TPUB"});
            temp.insert({typeField::isrc, "TSRC"});
            temp.insert({typeField::encoder, "TENC"});
            temp.insert({typeField::copyright, "TCOP"});

            return temp;
        }();

        static tagMap mp4 = [] {
            tagMap temp;

            temp.insert({typeField::title, "@nam"});
            temp.insert({typeField::artist, "@ART"});
            temp.insert({typeField::albumArtist, "aART"});
            temp.insert({typeField::album, "@alb"});
            temp.insert({typeField::trackNumber, "trkn"});
            temp.insert({typeField::totalTracks, "trkn (pair)"});
            temp.insert({typeField::discNumber, "disk"});
            temp.insert({typeField::totalDiscs, "disk (pair)"});
            temp.insert({typeField::year, "@day"});
            temp.insert({typeField::genre, "@gen"});
            temp.insert({typeField::composer, "@wrt"});
            // Conductor is not directly supported in M4A/MP4 Atom format
            temp.insert({typeField::lyricist, "@lyr"});
            temp.insert({typeField::lyrics, "@lyr"});
            temp.insert({typeField::comment, "@cmt"});
            temp.insert({typeField::bpm, "tmpo"});
            temp.insert({typeField::compilation, "cpil"});
            temp.insert({typeField::publisherLabel, "@pub"});
            // ISRC is not directly supported in M4A/MP4 Atom format
            temp.insert({typeField::encoder, "@too"});
            temp.insert({typeField::copyright, "cprt"});

            return temp;
        }();

        static tagMap flac = [] {
            tagMap temp;

            temp.insert({typeField::title, "TITLE"});
            temp.insert({typeField::artist, "ARTIST"});
            temp.insert({typeField::albumArtist, "ALBUMARTIST"});
            temp.insert({typeField::album, "ALBUM"});
            temp.insert({typeField::trackNumber, "TRACKNUMBER"});
            temp.insert({typeField::totalTracks, "TRACKTOTAL"});
            temp.insert({typeField::discNumber, "DISCNUMBER"});
            temp.insert({typeField::totalDiscs, "DISCTOTAL"});
            temp.insert({typeField::year, "DATE"});
            temp.insert({typeField::genre, "GENRE"});
            temp.insert({typeField::composer, "COMPOSER"});
            // Conductor is supported but not explicitly shown in the table (likely stored under ARTIST or ALBUMARTIST)
            temp.insert({typeField::lyricist, "LYRICIST"});
            temp.insert({typeField::lyrics, "LYRICS"});
            temp.insert({typeField::comment, "COMMENT"});
            // BPM is not directly supported in FLAC Vorbis Comment format
            temp.insert({typeField::compilation, "COMPILATION"});
            temp.insert({typeField::publisherLabel, "LABEL"});
            temp.insert({typeField::isrc, "ISRC"});
            temp.insert({typeField::encoder, "ENCODER"});
            temp.insert({typeField::copyright, "COPYRIGHT"});
            // Cover Art is stored as METADATA_BLOCK_PICTURE

            return temp;
        }();

        switch (format) {
            case MP3: return mp3;
            case FLAC: return flac;
            case M4A: return mp4;
            case OGG: return flac;
            case OPUS: return flac;
            default: return mp3;
        }
    }
}