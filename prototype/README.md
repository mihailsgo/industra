# Industra Depozīti · Front-end prototips

Šis klikšķināmais prototips demonstrē Industra Bank depozītu produkta klienta pieredzi bez sarežģītām back-end integrācijām.

## Iekļautā funkcionalitāte

- **Likmju pārskats** ar procesa un priekšrocību aprakstu.
- **Pieteikuma forma** ar AML piekrišanu un depozīta parametru ievadi.
- **Klienta panelis** ar statusa laika līniju, nākamajiem soļiem un iespēju atjaunot pieteikuma statusu.
- **Autentifikācijas makets** ar Smart-ID un eParaksta izvēli (simulēts identifikācijas process).
- **Datu servisu stubs** pieteikuma iesniegšanai un statusa atjaunināšanai (CRM/WALL imitācija).
- **Atkārtoti izmantojami UI komponenti** (kartes, pogas, metriku “chips”, laika līnija).

Visi dati glabājas tikai pārlūkprogrammas atmiņā.

## Darbināšana lokāli

```bash
cd prototype
npm install    # jau izpildīts, atkārtojiet tikai ja nepieciešams
npm run dev
```

Atveriet norādīto URL (parasti `http://localhost:5173`) un pārlūkojiet prototipu.

## Ieteicamie nākamie soļi

1. Pievienot dizaina bibliotēku (Storybook/Figma) un notēmēt vizuālo identitāti ar Industra stila vadlīnijām.
2. Pievienot datu validāciju un kļūdu scenāriju maketus (AML noraidījumi, identifikācijas kļūdas).
3. Izveidot API līgumu dokumentāciju un sagatavot integrācijas adapteru prototipus (CRM, WALL, AML reģistri).
