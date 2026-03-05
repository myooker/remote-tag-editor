//
// Created by myooker on 1/27/26.
//

#ifndef WEB_TAG_EDITOR_MPEG4TAGHANDLER_H
#define WEB_TAG_EDITOR_MPEG4TAGHANDLER_H

#include <tstring.h>

#include "../../include/musicTagHandler.h"

namespace audioFormat {
    enum class atomType : int {
        TEXT,
        UINT8,
        PICTURE,

        UNDEFINED = 99
    };

    constexpr std::string_view atomTypeToString(const atomType atom) {
        switch (atom) {
            case atomType::TEXT: return "TEXT";
            case atomType::UINT8: return "UINT8";
            case atomType::PICTURE: return "PICTURE";
            case atomType::UNDEFINED: return "UNDEFINED";
            default: return "UNDEFINED";
        }
    }

    inline std::ofstream &operator<<(std::ofstream &out, const atomType atom) {
        out << atomTypeToString(atom);
        return out;
    }

    inline std::ostringstream &operator<<(std::ostringstream &out, const atomType atom) {
        out << atomTypeToString(atom);
        return out;
    }

    // This struct represent the following table:
    // https://atomicparsley.sourceforge.net/mpeg-4files.html
    // It will contain both values: name and flag (data type)
    struct atomEntity {
        std::string name{ "©alb" };
        atomType flag{ atomType::TEXT };
    };

    class mpeg4TagHandler : public musicTagHandler {
    public:
        static atomEntity atomToString(const std::string &atom);
        static TagLib::String stringToAtom(const std::string &atom);
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        static void addUserDefinedAtom(const program::TagModification &tagStruct);
        crow::response removeMusicTag(const program::TagModification &tagStruct) override;
        crow::response addMusicTag(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_MPEG4TAGHANDLER_H