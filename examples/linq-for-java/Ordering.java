import io.github.piscescup.linq4j.Linq;

public class Ordering {
    record Person(String name, int age) {
        @Override
        public String toString() {
            return name + "-" + age;
        }
    }

    public static void main(String[] args) {
        var people = Linq.of(
            new Person("Alice", 25),
            new Person("Bob", 20),
            new Person("Charlie", 25)
        );

        var ordered = people
            .orderBy(Person::age)
            .thenBy(Person::name)
            .toList();

        System.out.println(ordered);
    }
}
