#ifndef WEB_TAG_EDITOR_UTILS_H
#define WEB_TAG_EDITOR_UTILS_H

#include <algorithm>
#include <string>
#include <optional>

namespace rte::utils {
    bool naturalLess(std::string_view l, std::string_view r);
    std::optional<bool> parseBool(std::string_view a);
}

#endif //WEB_TAG_EDITOR_UTILS_H
