//
// Created by myooker on 1/24/26.
//

#include "../include/musicTagHandlerFactory.h"
#include "../include/format_handlers/flacTagHandler.h"
#include "../include/format_handlers/mpeg4TagHandler.h"
#include "../include/format_handlers/mpegTagHandler.h"

std::unique_ptr<musicTagHandler> musicTagHandlerFactory::createHandler(const std::string &extension) {
    if (extension == ".mp3")
        return std::make_unique<audioFormat::mpegTagHandler>();
    if (extension == ".flac")
        return std::make_unique<audioFormat::flacTagHandler>();
    if (extension == ".m4a")
        return std::make_unique<audioFormat::mpeg4TagHandler>();

    return nullptr;
}
