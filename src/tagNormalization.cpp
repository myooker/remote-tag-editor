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

            {
                // ACOUSTIC_ID
                reg(format::ID3v23, tag::acousticID, "TXXX:Acoustid Id");
                reg(format::ID3v24, tag::acousticID, "TXXX:Acoustid Id");
                reg(format::M4A, tag::acousticID, "----:com.apple.iTunes:Acoustid Id");
                reg(format::FLAC, tag::acousticID, tag::acousticID);

                // ACOUSTID_FINGERPRINT
                reg(format::ID3v23, tag::acousticIDfingerprint, "TXXX:Acoustid Fingerprint");
                reg(format::ID3v24, tag::acousticIDfingerprint, "TXXX:Acoustid Fingerprint");
                reg(format::M4A, tag::acousticIDfingerprint, "----:com.apple.iTunes:Acoustid Fingerprint");
                reg(format::FLAC, tag::acousticIDfingerprint, tag::acousticIDfingerprint);

                // ALBUM
                reg(format::ID3v23, tag::album, "TALB");
                reg(format::ID3v24, tag::album, "TALB");
                reg(format::M4A, tag::album, "©alb");
                reg(format::FLAC, tag::album, tag::album);

                // ALBUMSORT
                reg(format::ID3v23, tag::albumSort, "TSOA");
                reg(format::ID3v24, tag::albumSort, "TSOA");
                reg(format::M4A, tag::albumSort, "soal");
                reg(format::FLAC, tag::albumSort, tag::albumSort);

                // ALBUMARTIST
                reg(format::ID3v23, tag::albumArtist, "TPE2");
                reg(format::ID3v24, tag::albumArtist, "TPE2");
                reg(format::M4A, tag::albumArtist, "aART");
                reg(format::FLAC, tag::albumArtist, tag::albumArtist);

                // ALBUMARTISTSORT
                reg(format::ID3v23, tag::albumArtistSort, "TSO2");
                reg(format::ID3v24, tag::albumArtistSort, "TSO2");
                reg(format::M4A, tag::albumArtistSort, "soaa");
                reg(format::FLAC, tag::albumArtistSort, tag::albumArtistSort);

                // ARTIST
                reg(format::ID3v23, tag::artist, "TPE1");
                reg(format::ID3v24, tag::artist, "TPE1");
                reg(format::M4A, tag::artist, "©ART");
                reg(format::FLAC, tag::artist, tag::artist);

                // ARTISTSORT
                reg(format::ID3v23, tag::artistSort, "TSOP");
                reg(format::ID3v24, tag::artistSort, "TSOP");
                reg(format::M4A, tag::artistSort, "soar");
                reg(format::FLAC, tag::artistSort, tag::artistSort);

                // BARCODE
                reg(format::ID3v23, tag::barcode, "TXXX:BARCODE");
                reg(format::ID3v24, tag::barcode, "TXXX:BARCODE");
                reg(format::M4A, tag::barcode, "----:com.apple.iTunes:BARCODE");
                reg(format::FLAC, tag::barcode, tag::barcode);

                // BPM
                reg(format::ID3v23, tag::bpm, "TBPM");
                reg(format::ID3v24, tag::bpm, "TBPM");
                reg(format::M4A, tag::bpm, "tmpo");
                reg(format::FLAC, tag::bpm, tag::bpm);

                // CATALOGNUMBER
                reg(format::ID3v23, tag::catalogNumber, "TXXX:CATALOGNUMBER");
                reg(format::ID3v24, tag::catalogNumber, "TXXX:CATALOGNUMBER");
                reg(format::M4A, tag::catalogNumber, "----:com.apple.iTunes:CATALOGNUMBER");
                reg(format::FLAC, tag::catalogNumber, tag::catalogNumber);

                // COMMENT
                reg(format::ID3v23, tag::comment, "COMM");
                reg(format::ID3v24, tag::comment, "COMM");
                reg(format::M4A, tag::comment, "©cmt");
                reg(format::FLAC, tag::comment, tag::comment);

                // COMPILATION
                reg(format::ID3v23, tag::compilation, "TCMP");
                reg(format::ID3v24, tag::compilation, "TCMP");
                reg(format::M4A, tag::compilation, "cpil");
                reg(format::FLAC, tag::compilation, tag::compilation);

                // COMPOSER
                reg(format::ID3v23, tag::composer, "TCOM");
                reg(format::ID3v24, tag::composer, "TCOM");
                reg(format::M4A, tag::composer, "©wrt");
                reg(format::FLAC, tag::composer, tag::composer);

                // COMPOSERSORT
                reg(format::ID3v23, tag::composerSort, "TSOC");
                reg(format::ID3v24, tag::composerSort, "TSOC");
                reg(format::M4A, tag::composerSort, "soco");
                reg(format::FLAC, tag::composerSort, tag::composerSort);

                // CONDUCTOR
                reg(format::ID3v23, tag::conductor, "TPE3");
                reg(format::ID3v24, tag::conductor, "TPE3");
                reg(format::M4A, tag::conductor, "©con");
                reg(format::FLAC, tag::conductor, tag::conductor);

                // CONTENTGROUP
                reg(format::ID3v23, tag::contentGroup, "TIT1");
                reg(format::ID3v24, tag::contentGroup, "TIT1");
                reg(format::M4A, tag::contentGroup, "©grp");
                reg(format::FLAC, tag::contentGroup, tag::contentGroup);

                // COPYRIGHT
                reg(format::ID3v23, tag::copyright, "TCOP");
                reg(format::ID3v24, tag::copyright, "TCOP");
                reg(format::M4A, tag::copyright, "cprt");
                reg(format::FLAC, tag::copyright, tag::copyright);

                // DATE
                reg(format::ID3v23, tag::date, "TDAT");
                reg(format::ID3v24, tag::date, "TXXX:DATE");
                reg(format::M4A, tag::date, "");
                reg(format::FLAC, tag::date, tag::date);

                // DESCRIPTION
                reg(format::ID3v23, tag::description, "");
                reg(format::ID3v24, tag::description, "");
                reg(format::M4A, tag::description, "desc");
                reg(format::FLAC, tag::description, tag::description);

                // DISCNUMBER
                reg(format::ID3v23, tag::discNumber, "TPOS");
                reg(format::ID3v24, tag::discNumber, "TPOS");
                reg(format::M4A, tag::discNumber, "disk");
                reg(format::FLAC, tag::discNumber, tag::discNumber);

                // ENCODEDBY
                reg(format::ID3v23, tag::encodedby, "TENC");
                reg(format::ID3v24, tag::encodedby, "TENC");
                reg(format::M4A, tag::encodedby, "©enc");
                reg(format::FLAC, tag::encodedby, tag::encodedby);

                // ENCODERSETTINGS
                reg(format::ID3v23, tag::encoderSettings, "TSSE");
                reg(format::ID3v24, tag::encoderSettings, "TSSE");
                reg(format::M4A, tag::encoderSettings, "");
                reg(format::FLAC, tag::encoderSettings, tag::encoderSettings);

                // ENCODINGTIME
                reg(format::ID3v23, tag::encodingTime, "");
                reg(format::ID3v24, tag::encodingTime, "TDEN");
                reg(format::M4A, tag::encodingTime, "");
                reg(format::FLAC, tag::encodingTime, tag::encodingTime);

                // FILEOWNER
                reg(format::ID3v23, tag::fileowner, "TOWN");
                reg(format::ID3v24, tag::fileowner, "TOWN");
                reg(format::M4A, tag::fileowner, "");
                reg(format::FLAC, tag::fileowner, tag::fileowner);

                // FILETYPE
                reg(format::ID3v23, tag::filetype, "TFLT");
                reg(format::ID3v24, tag::filetype, "TFLT");
                reg(format::M4A, tag::filetype, "");
                reg(format::FLAC, tag::filetype, tag::filetype);

                // GENRE
                reg(format::ID3v23, tag::genre, "TCON");
                reg(format::ID3v24, tag::genre, "TCON");
                reg(format::M4A, tag::genre, "©gen");
                reg(format::FLAC, tag::genre, tag::genre);

                // GROUPING
                reg(format::ID3v23, tag::grouping, "GRP1");
                reg(format::ID3v24, tag::grouping, "GRP1");
                reg(format::M4A, tag::grouping, "");
                reg(format::FLAC, tag::grouping, tag::grouping);

                // INITIALKEY
                reg(format::ID3v23, tag::initialKey, "TKEY");
                reg(format::ID3v24, tag::initialKey, "TKEY");
                reg(format::M4A, tag::initialKey, "");
                reg(format::FLAC, tag::initialKey, tag::initialKey);

                // INVOLVEDPEOPLE
                reg(format::ID3v23, tag::involvedPeople, "IPLS");
                reg(format::ID3v24, tag::involvedPeople, "TIPL");
                reg(format::M4A, tag::involvedPeople, "");
                reg(format::FLAC, tag::involvedPeople, tag::involvedPeople);

                // ISRC
                reg(format::ID3v23, tag::isrc, "TSRC");
                reg(format::ID3v24, tag::isrc, "TSRC");
                reg(format::M4A, tag::isrc, "");
                reg(format::FLAC, tag::isrc, tag::isrc);

                // LANGUAGE
                reg(format::ID3v23, tag::language, "TLAN");
                reg(format::ID3v24, tag::language, "TLAN");
                reg(format::M4A, tag::language, "");
                reg(format::FLAC, tag::language, tag::language);

                // LENGTH
                reg(format::ID3v23, tag::length, "TLEN");
                reg(format::ID3v24, tag::length, "TLEN");
                reg(format::M4A, tag::length, "----:com.apple.iTunes:LENGTH");
                reg(format::FLAC, tag::length, tag::length);

                // LYRICIST
                reg(format::ID3v23, tag::lyricist, "TEXT");
                reg(format::ID3v24, tag::lyricist, "TEXT");
                reg(format::M4A, tag::lyricist, "");
                reg(format::FLAC, tag::lyricist, tag::lyricist);

                // MEDIATYPE
                reg(format::ID3v23, tag::mediatype, "TMED");
                reg(format::ID3v24, tag::mediatype, "TMED");
                reg(format::M4A, tag::mediatype, "");
                reg(format::FLAC, tag::mediatype, tag::mediatype);

                // MIXARTIST
                reg(format::ID3v23, tag::mixartist, "TPE4");
                reg(format::ID3v24, tag::mixartist, "TPE4");
                reg(format::M4A, tag::mixartist, "");
                reg(format::FLAC, tag::mixartist, tag::mixartist);

                // MOOD
                reg(format::ID3v23, tag::mood, "");
                reg(format::ID3v24, tag::mood, "TMOO");
                reg(format::M4A, tag::mood, "");
                reg(format::FLAC, tag::mood, tag::mood);

                // MOVEMENTNAME
                reg(format::ID3v23, tag::movementName, "MVNM");
                reg(format::ID3v24, tag::movementName, "MVNM");
                reg(format::M4A, tag::movementName, "©mvn");
                reg(format::FLAC, tag::movementName, tag::movementName);

                // MOVEMENT
                reg(format::ID3v23, tag::movement, "MVIN");
                reg(format::ID3v24, tag::movement, "MVIN");
                reg(format::M4A, tag::movement, "©mvi");
                reg(format::FLAC, tag::movement, tag::movement);

                // MOVEMENTOTAL
                reg(format::ID3v23, tag::movementTotal, "MVIN");
                reg(format::ID3v24, tag::movementTotal, "MVIN");
                reg(format::M4A, tag::movementTotal, "©mvc");
                reg(format::FLAC, tag::movementTotal, tag::movementTotal);

                // MUSICBRAINZ_ALBUMARTISTID
                reg(format::ID3v23, tag::mb_albumArtistID, "TXXX:MusicBrainz Album Artist Id");
                reg(format::ID3v24, tag::mb_albumArtistID, "TXXX:MusicBrainz Album Artist Id");
                reg(format::M4A, tag::mb_albumArtistID, "----:com.apple.iTunes:MusicBrainz Album Artist Id");
                reg(format::FLAC, tag::mb_albumArtistID, tag::mb_albumArtistID);

                // MUSICBRAINZ_ALBUMID
                reg(format::ID3v23, tag::mb_albumID, "TXXX:MusicBrainz Album Id");
                reg(format::ID3v24, tag::mb_albumID, "TXXX:MusicBrainz Album Id");
                reg(format::M4A, tag::mb_albumID, "----:com.apple.iTunes:MusicBrainz Album Id");
                reg(format::FLAC, tag::mb_albumID, tag::mb_albumID);

                // MUSICBRAINZ_ALBUMRELEASECOUNTRY
                reg(format::ID3v23, tag::mb_albumReleaseCountry, "TXXX:MusicBrainz Album Release Country");
                reg(format::ID3v24, tag::mb_albumReleaseCountry, "TXXX:MusicBrainz Album Release Country");
                reg(format::M4A, tag::mb_albumReleaseCountry, "----:com.apple.iTunes:MusicBrainz Album Release Country");
                reg(format::FLAC, tag::mb_albumReleaseCountry, tag::mb_albumReleaseCountry);

                // MUSICBRAINZ_ALBUMSTATUS
                reg(format::ID3v23, tag::mb_albumStatus, "TXXX:MusicBrainz Album Status");
                reg(format::ID3v24, tag::mb_albumStatus, "TXXX:MusicBrainz Album Status");
                reg(format::M4A, tag::mb_albumStatus, "----:com.apple.iTunes:MusicBrainz Album Status");
                reg(format::FLAC, tag::mb_albumStatus, tag::mb_albumStatus);

                // MUSICBRAINZ_ALBUMTYPE
                reg(format::ID3v23, tag::mb_albumtype, "TXXX:MusicBrainz Album Type");
                reg(format::ID3v24, tag::mb_albumtype, "TXXX:MusicBrainz Album Type");
                reg(format::M4A, tag::mb_albumtype, "----:com.apple.iTunes:MusicBrainz Album Type");
                reg(format::FLAC, tag::mb_albumtype, tag::mb_albumtype);

                // MUSICBRAINZ_ARTISTID
                reg(format::ID3v23, tag::mb_artistID, "TXXX:MusicBrainz Artist Id");
                reg(format::ID3v24, tag::mb_artistID, "TXXX:MusicBrainz Artist Id");
                reg(format::M4A, tag::mb_artistID, "----:com.apple.iTunes:MusicBrainz Artist Id");
                reg(format::FLAC, tag::mb_artistID, tag::mb_artistID);

                // MUSICBRAINZ_DISCID
                reg(format::ID3v23, tag::mb_discID, "TXXX:MusicBrainz Disc Id");
                reg(format::ID3v24, tag::mb_discID, "TXXX:MusicBrainz Disc Id");
                reg(format::M4A, tag::mb_discID, "----:com.apple.iTunes:MusicBrainz Disc Id");
                reg(format::FLAC, tag::mb_discID, tag::mb_discID);

                // MUSICBRAINZ_ORIGINALALBUMID
                reg(format::ID3v23, tag::mb_originalAlbumID, "TXXX:MusicBrainz Original Album Id");
                reg(format::ID3v24, tag::mb_originalAlbumID, "TXXX:MusicBrainz Original Album Id");
                reg(format::M4A, tag::mb_originalAlbumID, "----:com.apple.iTunes:MusicBrainz Original Album Id");
                reg(format::FLAC, tag::mb_originalAlbumID, tag::mb_originalAlbumID);

                // MUSICBRAINZ_ORIGINALARTISTID
                reg(format::ID3v23, tag::mb_originalArtistID, "TXXX:MusicBrainz Original Artist Id");
                reg(format::ID3v24, tag::mb_originalArtistID, "TXXX:MusicBrainz Original Artist Id");
                reg(format::M4A, tag::mb_originalArtistID, "----:com.apple.iTunes:MusicBrainz Original Artist Id");
                reg(format::FLAC, tag::mb_originalArtistID, tag::mb_originalArtistID);

                // MUSICBRAINZ_RELEASEGROUPID
                reg(format::ID3v23, tag::mb_releaseGroupID, "TXXX:MusicBrainz Release Group Id");
                reg(format::ID3v24, tag::mb_releaseGroupID, "TXXX:MusicBrainz Release Group Id");
                reg(format::M4A, tag::mb_releaseGroupID, "----:com.apple.iTunes:MusicBrainz Release Group Id");
                reg(format::FLAC, tag::mb_releaseGroupID, tag::mb_releaseGroupID);

                // MUSICBRAINZ_RELEASETRACKID
                reg(format::ID3v23, tag::mb_releaseTrackID, "TXXX:MusicBrainz Release Track Id");
                reg(format::ID3v24, tag::mb_releaseTrackID, "TXXX:MusicBrainz Release Track Id");
                reg(format::M4A, tag::mb_releaseTrackID, "----:com.apple.iTunes:MusicBrainz Release Track Id");
                reg(format::FLAC, tag::mb_releaseTrackID, tag::mb_releaseTrackID);

                // MUSICBRAINZ_TRACKID
                reg(format::ID3v23, tag::mb_trackID, "TXXX:MusicBrainz Track Id");
                reg(format::ID3v24, tag::mb_trackID, "TXXX:MusicBrainz Track Id");
                reg(format::M4A, tag::mb_trackID, "----:com.apple.iTunes:MusicBrainz Track Id");
                reg(format::FLAC, tag::mb_trackID, tag::mb_trackID);

                // MUSICBRAINZ_TRMID
                reg(format::ID3v23, tag::mb_trmID, "TXXX:MusicBrainz TRM Id");
                reg(format::ID3v24, tag::mb_trmID, "TXXX:MusicBrainz TRM Id");
                reg(format::M4A, tag::mb_trmID, "----:com.apple.iTunes:MusicBrainz TRM Id");
                reg(format::FLAC, tag::mb_trmID, tag::mb_trmID);

                // MUSICBRAINZ_WORKID
                reg(format::ID3v23, tag::mb_workID, "TXXX:MusicBrainz Work Id");
                reg(format::ID3v24, tag::mb_workID, "TXXX:MusicBrainz Work Id");
                reg(format::M4A, tag::mb_workID, "----:com.apple.iTunes:MusicBrainz Work Id");
                reg(format::FLAC, tag::mb_workID, tag::mb_workID);

                // MUSICIANCREDITS
                reg(format::ID3v23, tag::musicianCredits, "TMCL");
                reg(format::ID3v24, tag::musicianCredits, "TMCL");
                reg(format::M4A, tag::musicianCredits, "");
                reg(format::FLAC, tag::musicianCredits, tag::musicianCredits);

                // NARRATOR
                reg(format::ID3v23, tag::narrator, "");
                reg(format::ID3v24, tag::narrator, "");
                reg(format::M4A, tag::narrator, "©nrt");
                reg(format::FLAC, tag::narrator, tag::narrator);

                // NETRADIOOWNER
                reg(format::ID3v23, tag::netRadioOwner, "TRSO");
                reg(format::ID3v24, tag::netRadioOwner, "TRSO");
                reg(format::M4A, tag::netRadioOwner, "");
                reg(format::FLAC, tag::netRadioOwner, tag::netRadioOwner);

                // NETRADIOSTATION
                reg(format::ID3v23, tag::netRadioStation, "TRSN");
                reg(format::ID3v24, tag::netRadioStation, "TRSN");
                reg(format::M4A, tag::netRadioStation, "");
                reg(format::FLAC, tag::netRadioStation, tag::netRadioStation);

                // ORIGALBUM
                reg(format::ID3v23, tag::origalbum, "TOAL");
                reg(format::ID3v24, tag::origalbum, "TOAL");
                reg(format::M4A, tag::origalbum, "");
                reg(format::FLAC, tag::origalbum, tag::origalbum);

                // ORIGARTIST
                reg(format::ID3v23, tag::origartist, "TOPE");
                reg(format::ID3v24, tag::origartist, "TOPE");
                reg(format::M4A, tag::origartist, "");
                reg(format::FLAC, tag::origartist, tag::origartist);

                // ORIGFILENAME
                reg(format::ID3v23, tag::origfilename, "TOFN");
                reg(format::ID3v24, tag::origfilename, "TOFN");
                reg(format::M4A, tag::origfilename, "");
                reg(format::FLAC, tag::origfilename, tag::origfilename);

                // ORIGLYRICIST
                reg(format::ID3v23, tag::origlyricist, "TOLY");
                reg(format::ID3v24, tag::origlyricist, "TOLY");
                reg(format::M4A, tag::origlyricist, "");
                reg(format::FLAC, tag::origlyricist, tag::origlyricist);

                // ORIGYEAR
                reg(format::ID3v23, tag::origyear, "TORY");
                reg(format::ID3v24, tag::origyear, "TDOR");
                reg(format::M4A, tag::origyear, "");
                reg(format::FLAC, tag::origyear, tag::origyear);

                // PODCAST
                reg(format::ID3v23, tag::podcast, "PCST");
                reg(format::ID3v24, tag::podcast, "PCST");
                reg(format::M4A, tag::podcast, "pcst");
                reg(format::FLAC, tag::podcast, tag::podcast);

                // PODCASTCATEGORY
                reg(format::ID3v23, tag::podcastCategory, "TCAT");
                reg(format::ID3v24, tag::podcastCategory, "TCAT");
                reg(format::M4A, tag::podcastCategory, "catg");
                reg(format::FLAC, tag::podcastCategory, tag::podcastCategory);

                // PODCASTDESC
                reg(format::ID3v23, tag::podcastDesc, "TDES");
                reg(format::ID3v24, tag::podcastDesc, "TDES");
                reg(format::M4A, tag::podcastDesc, "ldes");
                reg(format::FLAC, tag::podcastDesc, tag::podcastDesc);

                // PODCASTID
                reg(format::ID3v23, tag::podcastID, "TGID");
                reg(format::ID3v24, tag::podcastID, "TGID");
                reg(format::M4A, tag::podcastID, "egid");
                reg(format::FLAC, tag::podcastID, tag::podcastID);

                // PODCASTKEYWORDS
                reg(format::ID3v23, tag::podcastKeywords, "TKWD");
                reg(format::ID3v24, tag::podcastKeywords, "TKWD");
                reg(format::M4A, tag::podcastKeywords, "keyw");
                reg(format::FLAC, tag::podcastKeywords, tag::podcastKeywords);

                // PODCASTURL
                reg(format::ID3v23, tag::podcasturl, "WFED");
                reg(format::ID3v24, tag::podcasturl, "WFED");
                reg(format::M4A, tag::podcasturl, "purl");
                reg(format::FLAC, tag::podcasturl, tag::podcasturl);

                // POPULARIMETER
                reg(format::ID3v23, tag::popularimeter, "POPM");
                reg(format::ID3v24, tag::popularimeter, "POPM");
                reg(format::M4A, tag::popularimeter, "");
                reg(format::FLAC, tag::popularimeter, tag::popularimeter);

                // PUBLISHER
                reg(format::ID3v23, tag::publisher, "TPUB");
                reg(format::ID3v24, tag::publisher, "TPUB");
                reg(format::M4A, tag::publisher, "©pub");
                reg(format::FLAC, tag::publisher, tag::publisher);

                // RATING MM
                reg(format::ID3v23, tag::rating_mm, "POPM");
                reg(format::ID3v24, tag::rating_mm, "POPM");
                reg(format::M4A, tag::rating_mm, "");
                reg(format::FLAC, tag::rating_mm, tag::rating_mm);

                // RATING WMP
                reg(format::ID3v23, tag::rating_wmp, "POPM");
                reg(format::ID3v24, tag::rating_wmp, "POPM");
                reg(format::M4A, tag::rating_wmp, "");
                reg(format::FLAC, tag::rating_wmp, tag::rating_wmp);

                // RELEASETIME
                reg(format::ID3v23, tag::releasetime, "TDRL");
                reg(format::ID3v24, tag::releasetime, "TDRL");
                reg(format::M4A, tag::releasetime, "");
                reg(format::FLAC, tag::releasetime, tag::releasetime);

                // SETSUBTITLE
                reg(format::ID3v23, tag::setsubtitle, "");
                reg(format::ID3v24, tag::setsubtitle, "TSST");
                reg(format::M4A, tag::setsubtitle, "");
                reg(format::FLAC, tag::setsubtitle, tag::setsubtitle);

                // SUBTITLE
                reg(format::ID3v23, tag::subtitle, "TIT3");
                reg(format::ID3v24, tag::subtitle, "TIT3");
                reg(format::M4A, tag::subtitle, "");
                reg(format::FLAC, tag::subtitle, tag::subtitle);

                // TAGGINGTIME
                reg(format::ID3v23, tag::taggingtime, "");
                reg(format::ID3v24, tag::taggingtime, "TDTG");
                reg(format::M4A, tag::taggingtime, "");
                reg(format::FLAC, tag::taggingtime, tag::taggingtime);

                // TITLE
                reg(format::ID3v23, tag::title, "TIT2");
                reg(format::ID3v24, tag::title, "TIT2");
                reg(format::M4A, tag::title, "©nam");
                reg(format::FLAC, tag::title, tag::title);

                // TITLESORT
                reg(format::ID3v23, tag::titleSort, "TSOT");
                reg(format::ID3v24, tag::titleSort, "TSOT");
                reg(format::M4A, tag::titleSort, "sonm");
                reg(format::FLAC, tag::titleSort, tag::titleSort);

                // TRACK
                reg(format::ID3v23, tag::track, "TRCK");
                reg(format::ID3v24, tag::track, "TRCK");
                reg(format::M4A, tag::track, "trkn");
                reg(format::FLAC, tag::track, tag::track);

                // UNIQUEFIELDID
                reg(format::ID3v23, tag::uniqueFieldID, "UFID");
                reg(format::ID3v24, tag::uniqueFieldID, "UFID");
                reg(format::M4A, tag::uniqueFieldID, "");
                reg(format::FLAC, tag::uniqueFieldID, tag::uniqueFieldID);

                // UNSYNCEDLYRICS
                reg(format::ID3v23, tag::unsyncedLyrics, "USLT");
                reg(format::ID3v24, tag::unsyncedLyrics, "USLT");
                reg(format::M4A, tag::unsyncedLyrics, "©lyr");
                reg(format::FLAC, tag::unsyncedLyrics, tag::unsyncedLyrics);

                // YEAR
                reg(format::ID3v23, tag::year, "TYER");
                reg(format::ID3v24, tag::year, "TDRC");
                reg(format::M4A, tag::year, "©day");
                reg(format::FLAC, tag::year, tag::year);

                // COVERART
                reg(format::ID3v23, tag::coverArt,      "APIC");
                reg(format::ID3v24, tag::coverArt,      "APIC");
                reg(format::M4A, tag::coverArt,      "covr");
                reg(format::FLAC, tag::coverArt,     "METADATA_BLOCK_PICTURE");

                // Program-defined tags
                // RTEID
                reg(format::ID3v23, tag::rteID, "TXXX:RTEID");
                reg(format::ID3v24, tag::rteID, "TXXX:RTEID");
                reg(format::M4A, tag::rteID, "----:com.apple.iTunes:RTEID");
                reg(format::FLAC, tag::rteID, tag::rteID);

            }

            return temp;
        }();

        return s_registry;
    }

    const json &getJsonTagRegistry() {
        static json j = []() {
            json t;

            std::unordered_set<std::string> s;
            const auto &reg = getTagRegistry();

            for (const auto &entity : reg.rawToNormalized) {
                s.insert(entity.second);
            }

            for (const auto &entity : s) {
                t.push_back(entity);
            }

            return t;
        }();

        return j;
    }

    std::string normalize(const std::string &rawTag) {
        const auto &reg = getTagRegistry();
        auto it = reg.rawToNormalized.find(rawTag);

        if (it != reg.rawToNormalized.end()) {
            return it->second;
        }

        // Strip m4a user-defined prefix
        if (rawTag.starts_with(prefix::m4a)) {
            std::string normalized { rawTag };
            normalized = normalized.substr(prefix::m4a.size());
            return normalized;
        }

        // Strip mp3 user-defined prefix
        if (rawTag.starts_with(prefix::mp3)) {
            std::string normalized { rawTag };
            normalized = normalized.substr(prefix::mp3.size());
            return normalized;
        }

        return rawTag;
    }

    std::string normalize(const std::string &rawTag, format format) {
        const auto &reg = getTagRegistry();

        auto fmtit = reg.normalizedToRaw.find(format);
        if (fmtit != reg.normalizedToRaw.end()) {
            for (const auto &entity : fmtit->second) {
                if (entity.second == rawTag) return entity.first;
            }
        }

        return normalize(rawTag);
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

        if (format == format::ID3v23) {
            return std::string(prefix::mp3) + normalizedTag;
        }
        if (format == format::ID3v24) {
            return std::string(prefix::mp3) + normalizedTag;
        }
        if (format == format::M4A) {
            return std::string(prefix::m4a) + normalizedTag;
        }
        return normalizedTag;
    }
}