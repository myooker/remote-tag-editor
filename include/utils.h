#ifndef WEB_TAG_EDITOR_UTILS_H
#define WEB_TAG_EDITOR_UTILS_H

#include <algorithm>
#include <string>
#include <optional>
#include "rte.h"

namespace rte::utils {
    bool naturalLess(std::string_view l, std::string_view r);
    bool nameLess(const FileEntity &a, const FileEntity &b);
    bool entityLess(const FileEntity &a, const FileEntity &b, const QueryList &q);
    std::optional<bool> parseBool(std::string_view a);
    std::optional<QueryList::SortType> parseSortType(std::string_view a);


}

#endif //WEB_TAG_EDITOR_UTILS_H
