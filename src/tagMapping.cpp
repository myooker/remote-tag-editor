//
// Created by myooker on 3/1/26.
//

#include "../include/music.h"
#include <crow/logging.h>
#include <unordered_set>

namespace program::music::tag {
    TagMapping* getTagMap() {
        std::ifstream f { "data/mapping.json" };
        if (!f.is_open()) {
            CROW_LOG_ERROR << __PRETTY_FUNCTION__ << ": mapping.json file was not found.";
            return nullptr;
        }
        static TagMapping tm { (std::move(f)) };
        f.close();
        return &tm;
    }
}