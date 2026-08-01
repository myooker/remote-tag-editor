//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MPEGTAGHANDLER_H
#define WEB_TAG_EDITOR_MPEGTAGHANDLER_H

#include "../../include/ImusicTagHandler.h"
#include <id3v2tag.h>

namespace audioFormat {
    class mpegTagHandler : public ImusicTagHandler {
    private:
        static void removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &value);
        static void addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &text);
        static void editTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const program::TagModification &tagStruct);
        static void ensureRteid(std::string *rteid, TagLib::ID3v2::Tag *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override { return tag::Picture{}; };
        void removeAlbumCover(const std::string& filePath) override {};
        void addAlbumCover(const std::string& filePath) override {};
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_MPEGTAGHANDLER_H