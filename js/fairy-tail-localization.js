const dictionary = text => Object.fromEntries(text.trim().split('\n').map(line => line.split('|')));

export const fairyTailTranslations = {
  gender: dictionary(`
male|Мужской
female|Женский
unknown|Неизвестно
`),
  affiliation: dictionary(`
8-island|Восемь островов
akane resort casino|Казино курорта Аканэ
aldoron|Альдорон
alvarez empire|Империя Альварес
archaeological society|Археологическое общество
avatar|Аватар
balsamico family|Семья Бальзамико
blue pegasus|Синий Пегас
calamity bloods|Кровь Бедствия
carbuncle|Карбункул
celestial spirit world|Мир звёздных духов
crime sorciere|Грех Ведьмы
death's head caucus|Союз Черепа
diabolos|Диаболос
dogramag|Дограмаг
dullahan head|Голова Дюллахана
dwarf gear|Механизм Гнома
edolas|Эдолас
elefseria|Элефсерия
elentear|Элентир
fairy nail|Коготь Феи
fairy tail|Хвост Феи
faris|Фарис
fire & flame|Огонь и Пламя
fire village|Огненная деревня
five dragon gods|Пять богов-драконов
gagarock|Гагарок
galuna island|Остров Галуна
gramlush|Грамлаш
grand magic games|Великие магические игры
heartfilia clan|Семья Хартфилия
his pirate crew|Собственная пиратская команда
hosenka town|Город Хосэнка
hotel journey|Отель «Путешествие»
hound holy|Священная Гончая
ignia|Игния
kingdom of fiore|Королевство Фиор
lamia scale|Чешуя Ламии
lead eagle|Свинцовый Орёл
lobster family|Семья Лобстер
love & lucky|Любовь и Удача
mag drug|Магическая аптека
magia dragon|Магия Дракона
magic council|Магический совет
magnolia cake shop|Кондитерская Магнолии
magnolia church|Церковь Магнолии
mermaid heel|Пятка Русалки
naked mummy|Обнажённая Мумия
orochi's fin|Плавник Ороти
phoenix grave|Могила Феникса
proper grocer|Продуктовая лавка
quatro cerberus|Четырёхглавый Цербер
rondo wight|Рондо Уайт
sabertooth|Саблезубый Тигр
scheherazade theater|Театр Шахерезады
sorcerer magazine|Журнал «Волшебник»
stella|Стелла
sun village|Деревня Солнца
sylph labyrinth|Лабиринт Сильфа
tartaros|Тартарос
ten wizard saints|Десять Святых магов
titan nose|Нос Титана
tomekko restaurant|Ресторан Томэкко
twilight ogre|Сумеречный Огр
unnamed rogue guild|Безымянная гильдия отступников
veronica|Вероника
zentopia church|Церковь Зентопии
zeref dragneel|Зереф Драгнил
`),
  occupation: dictionary(`
actor|Актёр
actress|Актриса
adult star|Актёр для взрослых
alchemist|Алхимик
alchemist guild master mage|Мастер гильдии алхимиков, маг
anti-magic unit soldiers|Солдаты антимагического отряда
archbishop|Архиепископ
bandit mage|Бандит, маг
bartender|Бармен
cake shop owner|Владелец кондитерской
chef|Повар
chief of staff|Начальник штаба
coal miner|Шахтёр
councilman wizard saint|Член совета, Святой маг
cultist mage|Культист, маг
cultist mage swordsman|Культист, маг, мечник
dark mage|Тёмный маг
dark mage alchemist|Тёмный маг, алхимик
dark mage alchemist swordswoman|Тёмный маг, алхимик, мечница
dark mage assassin|Тёмный маг, наёмный убийца
dark mage assassin musician|Тёмный маг, наёмный убийца, музыкант
dark mage commander  of fire & flame scientist|Тёмный маг, командир «Огня и Пламени», учёный
dark mage scientist archivist|Тёмный маг, учёный, архивариус
dark mage swordsman|Тёмный маг, мечник
elefseria's aide|Помощник Элефсерии
emperor of the alvarez empire mage|Император Альвареса, маг
executioner knight|Рыцарь-палач
executioner knight leader of the garou knights|Рыцарь-палач, командир Рыцарей Гароу
executive secretary|Ответственный секретарь
fairy tail's medicinal advisor|Лекарь Хвоста Феи
foot model|Модель для рекламы обуви
freelance writer|Внештатный писатель
grand magic games announcer|Ведущий Великих магических игр
grand magic games' official referee|Судья Великих магических игр
guard|Стражник
guild master|Мастер гильдии
guild master of fire & flame|Мастер гильдии «Огонь и Пламя»
head chef of 8-island restaurant grand magic games commentator|Шеф-повар «Восьми островов», комментатор Великих магических игр
high school senior|Старшеклассник
hunter|Охотник
idol|Поп-идол
independent mage|Независимый маг
informant|Информатор
king of edolas|Король Эдоласа
knight cherry blossom holy knight squadron chief swordsman|Рыцарь, командир отряда Цветущей Сакуры, мечник
lacrima researcher|Исследователь лакрим
landlady of lucy's apartment|Хозяйка квартиры Люси
leader of the legion corps soldier|Командир Легиона, солдат
leader of the moonlight divinities guild master of diabolos|Предводитель Лунных богинь, мастер Диаболоса
legionairre|Легионер
legionnaire|Легионер
legionnaire knight|Рыцарь Легиона
mage|Маг
mage alchemist|Маг, алхимик
mage archaeologist|Маг, археолог
mage artist|Маг, художник
mage assassin martial artist|Маг, наёмный убийца, мастер боевых искусств
mage cook|Маг, повар
mage dancer|Маг, танцор
mage elementary school teacher|Маг, учитель начальной школы
mage farmer|Маг, фермер
mage guild master|Маг, мастер гильдии
mage guild master wizard saint|Маг, мастер гильдии, Святой маг
mage marksman|Маг, стрелок
mage markswoman|Маг, стрелок
mage martial artist|Маг, мастер боевых искусств
mage ninja|Маг, ниндзя
mage owner|Маг, владелец заведения
mage part-time agriculturist|Маг, земледелец
mage pirate captain|Маг, капитан пиратов
mage soldier|Маг, солдат
mage spy|Маг, шпион
mage swimsuit model|Маг, модель купальников
mage swordsman|Маг, мечник
mage swordsman magic teacher|Маг, мечник, учитель магии
mage swordsman marksman exorcist|Маг, мечник, стрелок, экзорцист
mage swordswoman|Маг, мечница
mage teacher|Маг, учитель
mage wizard saint councilman|Маг, Святой маг, член совета
mage writer|Маг, писатель
mages soldiers|Маги, солдаты
magic council chairman wizard saint|Председатель Магического совета, Святой маг
make-up artist|Визажист
manager|Управляющий
manager of hotel journey|Управляющий отелем «Путешествие»
manager of tomekko restaurant|Управляющий рестораном Томэкко
mascot|Талисман
mayor|Мэр
mayor of magnolia town|Мэр Магнолии
mercphobia's assistant|Помощница Меркофобии
minister|Министр
minister of defense|Министр обороны
model|Модель
novelist|Романист
owner|Владелец
pet|Питомец
photographer|Фотограф
pirate|Пират
pole dancer|Танцовщица на пилоне
politician|Политик
priest|Священник
priest cultist mage|Священник, культист, маг
priestess|Жрица
priestess mage|Жрица, маг
prince of veronica|Принц Вероники
princess of edolas|Принцесса Эдоласа
publishing company employee|Сотрудник издательства
queen|Королева
receptionist of love & lucky|Секретарь «Любви и Удачи»
reporter|Репортёр
rogue mages|Маги-отступники
royal army captain of the 1st magic war division|Капитан 1-го магического дивизиона королевской армии
royal army captain of the 2nd magic war division|Капитан 2-го магического дивизиона королевской армии
royal army captain of the 3rd magic war division|Капитан 3-го магического дивизиона королевской армии
royal army captain of the 4th magic war division|Капитан 4-го магического дивизиона королевской армии
s-class mage|Маг S-класса
s-class mage fairy hills head girl|Маг S-класса, староста общежития «Холмы Феи»
s-class mage fairy tail head waitress swimsuit model|Маг S-класса, старшая официантка Хвоста Феи, модель купальников
s-class mage martial artist|Маг S-класса, мастер боевых искусств
saleswoman  dark mage scientist|Продавщица, тёмный маг, учёный
shop owner|Владелец магазина
singer|Певец
slave trader|Работорговец
soldier|Солдат
soldier swordswoman leader of white tiger|Солдат, мечница, командир «Белого Тигра»
stand-up comedian|Стендап-комик
swimwear dancer|Танцовщица в купальнике
theater chairman|Директор театра
treasure hunter|Охотник за сокровищами
treasure hunter marksman|Охотник за сокровищами, стрелок
treasure hunter swordsman|Охотник за сокровищами, мечник
village chief|Староста деревни
whiteout shrine maiden|Жрица Белого храма
writer|Писатель
`),
  magic: dictionary(`
acid magic|Магия кислоты
aera|Аэра
air magic|Магия воздуха
airspace|Воздушное пространство
alphabet magic butterfly spirit magic sleet magic|Магия алфавита, духов бабочек и мокрого снега
angel magic|Магия ангелов
animal possession|Одержимость животными
aqua aera|Водная Аэра
arc of embodiment|Дуга воплощения
archive|Архив
athletic magic|Атлетическая магия
battle mode shift|Смена боевого режима
binding magic|Магия связывания
black arts|Чёрные искусства
black magic|Чёрная магия
blast magic|Взрывная магия
body restriction magic|Магия сковывания тела
burning spirit|Пылающий дух
burst magic|Магия импульса
capture|Захват
celestial spirit magic|Магия звёздных духов
chain magic|Магия цепей
charm|Очарование
clone magic|Магия клонов
command magic|Магия приказов
command t|Команда Т
concealment magic|Магия сокрытия
copy|Копирование
crimson hair|Алые волосы
crush|Сокрушение
curse magic|Магия проклятий
dancer|Танцор
dark regulus|Тёмный Регул
darkness magic|Магия тьмы
dead grand prix|Гран-при мертвецов
defense magic|Защитная магия
demonic black magic|Демоническая чёрная магия
destiny of death|Судьба смерти
dispel|Рассеивание
doll attack|Атака кукол
dragon slayer magic|Магия убийц драконов
dragon supremacy magic|Магия господства драконов
dragonization magic|Драконизация
drill 'n rock|Бур и камень
earth black magic|Чёрная магия земли
earth magic|Магия земли
egg magic|Магия яиц
elixir magic soundwave magic spirit magic|Магия эликсиров, звуковых волн и духов
enchant magic|Зачарование
energy beams|Энергетические лучи
energy blast|Энергетический взрыв
evil eye|Дурной глаз
eye magic|Магия глаз
fairy magic|Магия фей
famished soul|Голодная душа
fire eater|Пожиратель огня
fire god slayer magic|Магия огненного убийцы богов
fire illusion|Огненная иллюзия
fire magic|Магия огня
flattening magic|Магия сплющивания
fortune telling|Предсказание судьбы
gate open|Открытие врат
gears|Шестерни
giant|Гигант
gravity change|Изменение гравитации
gravity magic|Магия гравитации
great tree arc|Дуга Великого Древа
green magic|Зелёная магия
guns magic|Магия огнестрельного оружия
hair magic|Магия волос
healing magic|Исцеляющая магия
hearing magic|Магия слуха
heaven's eye|Небесный глаз
heavenly body magic|Магия небесных тел
high speed|Сверхскорость
historia of the dead|История мёртвых
human possession|Одержимость людьми
human subordination magic|Магия подчинения людей
ice devil slayer magic|Магия ледяного убийцы демонов
ice magic|Магия льда
ikusa-tsunagi|Икуса-Цунаги
illusion magic|Магия иллюзий
iron dog|Железный пёс
jet magic|Реактивная магия
jewel magic|Магия драгоценных камней
jutsu shiki|Магические письмена
lava magic force magic soundwave magic|Магия лавы, силы и звуковых волн
law of retrogression|Закон регрессии
legend of city|Легенда города
letter magic|Магия букв
life magic|Магия жизни
light magic|Магия света
lightning god slayer magic|Магия грозового убийцы богов
lightning magic|Магия молнии
living magic|Магия оживления
magic bird|Волшебная птица
magic card|Карточная магия
magical band|Магическая лента
magical drain|Поглощение магии
maguilty sense|Связь чувств
memory control|Управление памятью
memory-make|Созидание памяти
mimic|Подражание
mirror magic|Магия зеркал
molding magic|Магия созидания
moon drip|Лунная капля
mucus magic|Магия слизи
muscle speak|Язык мышц
needle magic|Магия игл
nightmare magic|Магия кошмаров
nirvana|Нирвана
nullification magic|Магия обнуления
organic link magic|Магия органической связи
orient solid script|Восточные твёрдые письмена
palm magic|Магия ладони
paper blizzard|Бумажная метель
perfume magic|Магия ароматов
personification magic|Магия олицетворения
phasing magic|Магия прохождения сквозь предметы
pict magic|Магия рисунка
plant|Растения
plant magic|Магия растений
pleasure|Наслаждение
poison aroma|Ядовитый аромат
polygon magic|Магия полигонов
purification magic|Магия очищения
purple flare|Пурпурное пламя
rainbow beam|Радужный луч
rainbow fire|Радужное пламя
reflector|Отражатель
regulus|Регул
requip|Перевооружение
ring magic|Магия колец
rules of the area|Правила территории
rupture magic|Магия разрыва
sacrificial summoning magic|Магия жертвенного призыва
sand magic|Магия песка
sandstorm|Песчаная буря
sealing magic|Магия запечатывания
seith magic|Магия душ
shade|Тень
shadow magic|Магия теней
shark spirit|Дух акулы
shikigami magic|Магия сикигами
sky black magic|Чёрная магия неба
sky god slayer magic|Магия небесного убийцы богов
slashing black magic|Режущая чёрная магия
sleep magic|Магия сна
sleet magic alphabet magic guardian magic|Магия мокрого снега, алфавита и защиты
slot magic|Магия игрового автомата
slow magic|Магия замедления
smoke magic|Магия дыма
snow magic|Магия снега
solid script|Твёрдые письмена
sound magic|Магия звука
spatial magic|Пространственная магия
spinning magic|Магия вращения
stealth|Незаметность
stone eyes|Каменные глаза
storm magic|Магия бури
super archive|Суперархив
sword magic|Магия мечей
take over|Перевоплощение
tear magic|Магия слёз
telekinesis|Телекинез
telepathy|Телепатия
terrain effect magic|Магия изменения местности
territory|Территория
thought projection|Мысленная проекция
thread magic|Магия нитей
time magic|Магия времени
torture magic|Магия пыток
transformation magic|Магия трансформации
transport|Перенос
ultimate destruction incarnate|Воплощение абсолютного разрушения
universe omega|Вселенная Омега
universe one|Вселенная Один
urumi|Уруми
vampire magic|Магия вампиров
vegetable magic|Магия овощей
velocity magic force magic lava magic|Магия скорости, силы и лавы
virus|Вирус
water|Вода
water magic|Магия воды
wave|Волна
weakness|Слабость
white arts|Белые искусства
white magic|Белая магия
whiteout|Белое обнуление
wind magic|Магия ветра
wool magic|Магия шерсти
writing magic|Магия письма
yakuma eighteen battle gods magic|Магия восемнадцати боевых богов Якума
`),
};
export function translateFairyTailValue(key, value) {
  if (value == null || value === '') return 'Не указано';
  return fairyTailTranslations[key]?.[String(value).trim().toLowerCase()] ?? String(value);
}
