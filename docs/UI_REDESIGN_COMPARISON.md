# AdmitFlow visual comparison

The before captures are from the previous Chromium build. The after captures use the redesigned app and the same capture script, viewport and UI state. Desktop comparisons use 1440 by 960 and mobile uses 390 by 844.

| Screen | Visible reference | Before and after | Design decision |
| --- | --- | --- | --- |
| Desktop overview | image(20261124-181525).png, still | [Before](../screenshots/before/desktop-overview.png) · [After](../screenshots/desktop-overview.png) | Patient activity sits in the left rail, admission trends take the center, and the right rail previews recent records. AdmitFlow uses actual admission data in place of the reference's rehabilitation modules. |
| Desktop directory | image(20261124-181525).png, still | [Before](../screenshots/before/desktop-patients.png) · [After](../screenshots/desktop-patients.png) | A compact activity rail makes room for the working table. Filter groups have their own surfaces. The still shows an overview, so the directory is an adaptation of its layout hierarchy. |
| Mobile directory | ebda32157054db6a498e698c9c840f64.webp, still | [Before](../screenshots/before/mobile-patients.png) · [After](../screenshots/mobile-patients.png) | The search and results come before secondary metrics. Patient cards retain searchable names, identifiers and accessible actions. The circular coral admission control adapts the reference's mobile navigation. |
| Admission drawer | Both stills, surface and accent cues | [Before](../screenshots/before/admission-drawer.png) · [After](../screenshots/admission-drawer.png) | Warm surfaces, a coral primary action and a toned backdrop extend the same hierarchy to the native dialog. The opening and closing transitions could not be compared to video. |

The three videos could not be transferred because the transfer host failed DNS resolution. This affected 1f99cfe90c5d8de81c7f073839422361(1).mp4 (the re-upload omits the suffix), 9dd0cab085199516ee63b383d3560ec1.mp4 and 2a9519af1f3e30dc968fda2df664479f.mp4. No video timestamps or motion fidelity are claimed.
