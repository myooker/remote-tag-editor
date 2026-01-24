//
// Created by myooker on 1/24/26.
//

#include "../include/musicTagHandlerFactory.h"
#include "../include/format_handlers/flacTagHandler.h"
#include "../include/format_handlers/mpegTagHandler.h"

std::unique_ptr<musicTagHandler> musicTagHandlerFactory::createHandler(const std::string &extension) {
    if (extension == ".mp3") {
        return std::make_unique<audioFormat::mpegTagHandler>();
    } else if (extension == ".flac") {
        return std::make_unique<audioFormat::flacTagHandler>();
    }

    return nullptr;
}
