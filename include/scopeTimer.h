//
// Created by myooker on 1/27/26.
//

#ifndef WEB_TAG_EDITOR_SCOPETIMER_H
#define WEB_TAG_EDITOR_SCOPETIMER_H
#include <chrono>
#include <iostream>

struct scopeTimer {
    std::string name{};
    std::chrono::steady_clock::time_point start{ std::chrono::steady_clock::now() };
    ~scopeTimer() {
        const auto end = std::chrono::steady_clock::now();
        const auto us = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();
        const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
        std::cout << "TIME SPENT: " << us << "us, " << ms << "ms\n";
    }
};

#endif //WEB_TAG_EDITOR_SCOPETIMER_H