Formato Informe Proyecto Final 

Integrantes 

Contenido 

I. Descripción breve de la herramienta 

II. Backlog de Requerimientos de seguridad 

III. Modelo de amenazas 

IV. Diagrama de Arquitectura 

V. Código fuente 

VI. Informe de análisis estático 

VII. Informe de Análisis dinámico 

VIII. URL de despliegue 

I. Descripción breve de la herramienta 

FutManager by Hakan is an application designed to optimize manual processes in a local soccer championship. As a first approach in functional and security contexts, it offers certain features to end-users (system administrators, team owners, and league representatives) to automate and optimize these processes, providing significant initial value.



The application features a robust authentication system, including login and user registration, powered by Supabase, ensuring security and scalability from the backend. The database, also developed using Supabase and PostgreSQL, is structured to manage the following essential entities for championship management:


Players: includes attributes like ID, name, surname, team, and their relationship with sanctions, allowing clear traceability of each participant.

Teams: defined by their name, number of players, and associated sanctions.

Sanctions: with detailed descriptions and corresponding amounts, facilitating transparent administration of penalties.

Roles and permissions: strategically designed to delimit responsibilities and available actions based on the user's profile.

Each role has specific functions within the system:

Administrator: responsible for registering and verifying teams and players through a manual validation process.

Team Owner: authorized to register their own team, consult their player list, and view both individual and collective sanctions.

Vocal: responsible for registering and deleting sanctions applicable to players and teams. Currently, their actions are managed from the backend, with the graphical interface being a responsibility of the development team.


This modular and controlled approach enhances the transparency and efficiency of the tournament, while laying the groundwork for future system expansion towards a completely digital and automated experience for any requested features.

II.
Backlog de Requerimientos de seguridad 
[The backlog can be detailed here or a link to the tool used can be provided, as long as the teacher has access to said repository.] 

ID	Descripción del requerimiento	Tipo	Pts historia	Sprint asignado
S-01	Respuesta automática ante violaciones de seguridad (FAU_ARP)	Funcional	5	1
S-02	Registro de acciones de usuarios para no repudio (FAU_GEN.1.2)	Funcional	5	1
S-03	Restricción de acceso a datos de auditoría (FAU_SAR.1.1)	Funcional	3	1
S-05	Gestión del almacenamiento de auditoría (FAU_STG.2-.5)	Funcional	5	2
S-04	Control de acceso basado en atributos (FDP_ACF.1)	Funcional	5	2
S-06	Declaración de roles y recursos permitidos (FDP_ACF.1.1)	Funcional	3	2
S-07	Definir acciones permitidas por rol (FDP_ACF.1.2)	Funcional	3	2
S-08	Generar hash de archivos para comprobar integridad (FDP_DAU.1.1)	No funcional	5	3
S-09	Comparar hash del archivo (FDP_DAU.1.2)	Funcional	3	3
S-10	Firma digital de archivos (FDP_DAU.2.2)	Funcional	5	3
S-11	Bloqueo tras intentos fallidos (FIA_AFL.1.1)	No funcional	3	1
S-12	Tiempo de espera tras fallos repetidos (FIA_AFL.1.2)	No funcional	3	1
S-13	Verificación de identidad con código por correo (FIA_API.1.1)	Funcional	5	1
S-14	Restricción de acciones según rol definido (FIA_ATD.1)	Funcional	3	2
S-15	Autenticación obligatoria (FIA_UAU.2)	Funcional	3	1
S-16	Mensajes de error genéricos (FIA_UAU.7)	No funcional	2	1
S-17	Bloqueo de acciones fuera de rol (FIA_USB.1.1)	Funcional	4	2
S-18	Aplicación de reglas de negocio por rol (FIA_USB.1.2)	Funcional	4	2

Exportar a Hojas de cálculo

S-01 - Respuesta automática ante violaciones de seguridad (FAU_ARP) 


Tipo: Funcional 


Descripción: The system must execute automatic actions when suspicious events are detected.


Complejidad: 5 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Blocks accounts after multiple failed authentication attempts.


S-02 - Registro de acciones de usuarios para no repudio (FAU_GEN.1.2) 


Tipo: Funcional 


Descripción: The system must log each user's actions with a timestamp.


Complejidad: 5 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Saves user, request, server response, IP, local date, and time.

Records are unalterable by normal users.

All queries are logged.


S-03 - Restricción de acceso a datos de auditoría (FAU_SAR.1.1) 


Tipo: No funcional 


Descripción: Only administrators should be able to read audit data.


Complejidad: 3 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Limited access to the audit module for administrators only.

If a non-administrator user tries to view the logs, they will not be displayed.


S-04 - Gestión del almacenamiento de auditoría (FAU_STG.2-.5) 


Tipo: Funcional 


Descripción: The system must protect, locate, and monitor log storage.


Complejidad: 5 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Audit data cannot be deleted without permission.

An alert is generated when 90% capacity is reached.


S-05 - Control de acceso basado en atributos (FDP_ACF.1) 


Tipo: Funcional 


Descripción: The system must apply access rules to resources based on user attributes.


Complejidad: 5 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Each action is validated according to the user's role.

Access to unauthorized modules is restricted.


S-06 - Declaración de roles y recursos permitidos (FDP_ACF.1.1) 


Tipo: Funcional 


Descripción: The system must allow defining roles and assigning accessible resources for each one.


Complejidad: 3 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Each role has assigned modules.

Access denied if the resource does not belong to the role.


S-07 - Definir acciones permitidas por rol (FDP_ACF.1.2) 


Tipo: Funcional 


Descripción: The system must control which actions each role can execute.


Complejidad: 3 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

The system validates each action before executing it.

Non-permitted actions are not shown in the interface.


S-08 - Generar hash de archivos para comprobar integridad (FDP_DAU.1.1) 


Tipo: No funcional 


Descripción: The system must generate a hash when saving a file to ensure it has not been altered.


Complejidad: 5 


Sprint: 3 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

A hash is calculated and stored per file.

Alterations are detected by comparing with the original hash.


S-09 - Comparar hash del archivo (FDP_DAU.1.2) 


Tipo: Funcional 


Descripción: The system must allow the administrator to compare the current hash of a file with the original.


Complejidad: 3 


Sprint: 3 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Shows the original and current hash.

Indicates whether there is a match or an alteration.


S-10 - Firma digital de archivos (FDP_DAU.2.2) 


Tipo: Funcional 


Descripción: The system must digitally sign relevant files using a certificate.


Complejidad: 5 


Sprint: 3 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Signature generated when the file is issued.

The signature can be externally verified.


S-11 - Bloqueo tras intentos fallidos (FIA_AFL.1.1) 


Tipo: No funcional 


Descripción: The system must temporarily block the account after several failed authentication attempts.


Complejidad: 3 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

The account is blocked after 5 attempts.

The event is logged.


S-12 - Tiempo de espera tras fallos repetidos (FIA_AFL.1.2) 


Tipo: No funcional 


Descripción: After exceeding the limit of failed attempts, the system must apply a waiting time.


Complejidad: 3 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

A minimum waiting time of 1 minute is activated.

An informative message is displayed to the user.


S-13 - Verificación de identidad con código por correo (FIA_API.1.1) 


Tipo: Funcional 


Descripción: The system must send a code via email to complete user login.


Complejidad: 5 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

The code is mandatory for access.

It has a limited time validity.


S-14 - Restricción de acciones según rol definido (FIA_ATD.1) 


Tipo: Funcional 


Descripción: The system must prevent users from performing actions not authorized by their role.


Complejidad: 3 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Each action is verified against the role's permissions.

Non-permitted actions are not shown to the user.


S-15 - Autenticación obligatoria (FIA_UAU.2) 


Tipo: Funcional 


Descripción: Every user must authenticate before interacting with the system.


Complejidad: 3 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Access to protected views is not allowed without an active session.

Automatically redirects to login.


S-16 - Mensajes de error genéricos (FIA_UAU.7) 


Tipo: No funcional 


Descripción: The system must display generic error messages to protect sensitive information.


Complejidad: 2 


Sprint: 1 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

No error message displays sensitive data such as passwords, usernames, or emails.

The error message only indicates a generic message according to the error.

The message should provide a brief indication of the solution.


S-17 - Bloqueo de acciones fuera de rol (FIA_USB.1.1) 


Tipo: Funcional 


Descripción: The system must prevent actions from being executed outside the assigned role.


Complejidad: 4 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Verifies each action against the user's role.

Informs that the current role cannot perform a certain action.


S-18 - Aplicación de reglas de negocio por rol (FIA_USB.1.2) 


Tipo: Funcional 


Descripción: Business rules are applied as role attributes to limit functions according to the profile.


Complejidad: 4 


Sprint: 2 


Responsable: Equipo de desarrollo 

Criterios de aceptación:

Business rules define restrictions by role.

Unauthorized actions are hidden or blocked.

III.
Modelo de amenazas 
[The context and top-level threat model should be included, with all processes, especially the implemented security processes] 

IV.
Diagrama de Arquitectura 


To represent the application in the C4 model, the context, container, and component levels have been considered, which are detailed below:

