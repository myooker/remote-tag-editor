//
// Created by myooker on 3/2/26.
//

#ifndef WEB_TAG_EDITOR_MUSIC_H
#define WEB_TAG_EDITOR_MUSIC_H

#include <algorithm>
#include <string>
#include <string_view>
#include <unordered_map>
#include <expected>

#include <nlohmann/json.hpp>
#include <nlohmann/json_fwd.hpp>
#include <crow/http_response.h>
#include <vector>

#include "music.h"
#include "program.h"

namespace program::music {
    enum class format;
    using json = nlohmann::json;

    namespace prefix {
        constexpr std::string_view mp3 { "TXXX:" };
        constexpr std::string_view m4a { "----:com.apple.iTunes:" };
    }

    namespace tag {
        using TagField = std::string_view;

        enum format {
            ID3v24, ID3v23,
            FLAC, M4A, OGG,
            OPUS, AAC, WMA,
            WAV, AIF, AIFF,
            ALAC,
        };

        // Program-defined tags
        constexpr TagField rteID                            { "RTEID" };

        class TagMapping {
        private:
            const json m_map;
            const json m_amap;
            std::unordered_map<std::string, const json*> m_aumap;
            std::size_t m_maphash;

            static json buildAliasMap(const json &src) {
                json out = json::object();
                for (const auto &[fname, values] : src.items()) {
                    json a = json::array();
                    for (const auto &[cname, cvalues] : values.items()) {
                        if (cvalues.is_array())
                            for (const auto &x : cvalues) a += x;
                        else
                            a += cvalues;
                    }
                    out[fname] = a;
                }
                return out;
            }
            std::unordered_map<std::string, const json*> buildUnorderedAliasMap() {
                std::unordered_map<std::string, const json*> t;
                for (const auto &[key, values] : m_amap.items()) {
                    for (const auto &value : values.items()) {
                        t.emplace(key, &value.value());
                    }
                }
                return t;
            }
        public:
            explicit TagMapping(std::ifstream f)
                : m_map (json::parse(f)),
                  m_amap (buildAliasMap(m_map)),
                  m_aumap (buildUnorderedAliasMap()),
                  m_maphash (std::hash<std::string>{}(m_map.dump())) {
            }

            std::size_t getMapHash() const { return m_maphash; }

            [[nodiscard]]
            const json &aliases() const noexcept { return m_amap; }
            [[nodiscard]]
            std::expected<const json*, std::string> find(const std::string &fname, const std::string &cname, format f=ID3v24) const {
                if (auto fname_it = m_map.find(fname); fname_it != m_map.end()) {
                    if (auto cname_it = fname_it->find(cname); cname_it != fname_it->end()) {
                        if (cname_it.value().is_array())
                            return &cname_it.value()[f]; // It will always resolve to v2.4 unless needd
                        return &cname_it.value();
                    }
                }

                return std::unexpected(fname + " was not found for " + cname);
            }

            [[nodiscard]]
            bool contain(const std::string &fname) const {
                return std::ranges::any_of(m_amap, [&, needle = json(fname)](const json &a) {
                    return std::ranges::find(a, needle) != a.end();
                });
            }

            [[nodiscard]]
            std::expected<std::string, std::string> resolve(const std::string &fname, const std::string &cname, format f=ID3v24) const {
                // An empty name would resolve to an empty frame ID further down.
                if (fname.empty())
                    return std::unexpected("empty tag name");

                if (const auto r = find(fname, cname, f)) {
                    if (!(*r)->is_string())
                        return std::unexpected(fname + " has a non-string " + cname + " mapping");
                    return (*r)->get<std::string>();
                }

                if (m_map.contains(fname))
                    return std::unexpected(fname + " has no " + cname + " mapping");

                if (contain(fname))
                    return fname;

                return std::unexpected(fname + " was not found for " + cname);
            }
        };

        const json& buildJsonTagRegistry();
        TagMapping* getTagMap();

        // Demo implementation
        struct Picture {
            crow::response response { 500, "Not found" };
            std::string mimeType {};
            std::string data {};
            int height {};
            int width {};
        };
    }


}
#endif //WEB_TAG_EDITOR_MUSIC_H