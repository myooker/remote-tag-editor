#ifndef WEB_TAG_EDITOR_MPEGTAGHANDLER_H
#define WEB_TAG_EDITOR_MPEGTAGHANDLER_H

#include "../../include/interface.h"
#include <id3v2tag.h>

namespace rte::music::handler {
    class Mpeg : public Interface {
    private:
        constexpr static std::string_view m_type { "id3v2" };
        static void removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &value);
        static void addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &text);
        static void editTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagModification &tagStruct);
        static void ensureRteid(std::string *rteid, TagLib::ID3v2::Tag *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const TagModification &tagStruct, std::string *rteid = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override { return tag::Picture{}; }
        void removeAlbumCover(const std::string& filePath) override {}
        void addAlbumCover(const std::string& filePath) override {}
        std::expected<std::string, std::string> resolveTag(std::string_view tag) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_MPEGTAGHANDLER_H