#ifndef WEB_TAG_EDITOR_OGGOPUSTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGOPUSTAGHANDLER_H

#include <xiphcomment.h>
#include "../../include/interface.h"

namespace rte::music::handler {
    class OggOpus : public Interface {
    private:
        constexpr static std::string_view m_type { "vorbis" };
        void ensureRteid(std::string *rteid, TagLib::Ogg::XiphComment *tag);
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

#endif // WEB_TAG_EDITOR_OGGOPUSTAGHANDLER_H